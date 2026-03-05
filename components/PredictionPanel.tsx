'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnomalyEvent } from '@/lib/signalEngine';
import {
  MarketState, PredictionSide, StakeAmount, UserMarketPosition,
  STAKE_TIERS, SIDE_CONFIG,
  placePrediction, loadMarketState, getUserPositionForSignal,
  computeSignalTruth, computeMarketStatus, msUntilExpiry,
  formatCountdown, computePotentialPayout, resolveMarket,
  xpForCorrectPrediction,
} from '@/lib/predictionMarket';
import { useWallet } from '@/lib/walletContext';
import { saveObserverXP } from '@/lib/opnetSignals';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface PredictionPanelProps {
  signal: AnomalyEvent;
  /** compact: just the ratio strip + predict button (used inside SignalCard) */
  compact?: boolean;
  onPredicted?: (side: PredictionSide, xp: number) => void;
}

type FlowStep = 'view' | 'select-side' | 'select-stake' | 'confirming' | 'broadcasting' | 'done' | 'error';

const SEV_COLOR: Record<string, string> = {
  LOW: '#00e676', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#ff1744',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PredictionPanel({ signal, compact = false, onPredicted }: PredictionPanelProps) {
  const { walletAddress, isConnected } = useWallet();

  const [market,   setMarket]   = useState<MarketState | null>(null);
  const [position, setPosition] = useState<UserMarketPosition | null>(null);
  const [step,     setStep]     = useState<FlowStep>('view');
  const [pendingSide,  setPendingSide]  = useState<PredictionSide | null>(null);
  const [pendingStake, setPendingStake] = useState<StakeAmount | null>(null);
  const [txHash,   setTxHash]   = useState<string | null>(null);
  const [earnedXP, setEarnedXP] = useState<number>(0);
  const [msLeft,   setMsLeft]   = useState(0);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load / refresh market state ────────────────────────────────────────────
  const refreshMarket = useCallback(() => {
    let m = loadMarketState(signal.id);

    // Auto-resolve if window elapsed and not yet resolved
    if (m && m.status === 'CLOSED') {
      m = resolveMarket(signal.id);
    } else if (!m) {
      // No market yet — show empty state so UI renders
      setMarket(null);
      setMsLeft(Math.max(0, signal.timestamp + 5 * 60_000 - Date.now()));
      return;
    }

    if (m) {
      const status = computeMarketStatus(m.expiresAt, m.status === 'RESOLVED');
      m.status = status;
      if (status === 'CLOSED') m = resolveMarket(signal.id) ?? m;
      setMarket({ ...m, status: m.status });
      setMsLeft(msUntilExpiry(m.expiresAt));
    }

    if (walletAddress) {
      setPosition(getUserPositionForSignal(signal.id, walletAddress));
    }
  }, [signal.id, signal.timestamp, walletAddress]);

  useEffect(() => {
    refreshMarket();
    timerRef.current = setInterval(() => {
      setMsLeft(prev => {
        const next = Math.max(0, prev - 1000);
        if (next === 0) refreshMarket();
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refreshMarket]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const validStaked  = market?.validStaked  ?? 0;
  const falseStaked  = market?.falseStaked  ?? 0;
  const totalStaked  = market?.totalStaked  ?? 0;
  const validPct     = totalStaked > 0 ? Math.round((validStaked / totalStaked) * 100) : 50;
  const falsePct     = 100 - validPct;
  const isOpen       = !market || market.status === 'OPEN';
  const isResolved   = market?.status === 'RESOLVED';
  const outcome      = market?.outcome ?? null;
  const canPredict   = isConnected && isOpen && !position && step === 'view';
  const sevColor     = SEV_COLOR[signal.severity] ?? '#c087f5';

  const potentialPayout = (pendingSide && pendingStake && market)
    ? computePotentialPayout(pendingStake, pendingSide, market)
    : null;

  // ── Handle placing prediction ──────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!walletAddress || !pendingSide || !pendingStake) return;
    setStep('confirming');
    await new Promise(r => setTimeout(r, 400));
    setStep('broadcasting');
    try {
      const { record, market: updated } = await placePrediction(
        signal.id, pendingSide, pendingStake,
        walletAddress, signal.type, signal.severity,
        signal.nodeName, signal.timestamp,
      );
      setTxHash(record.txHash);
      setMarket(updated);

      const winSidePool = pendingSide === 'VALID' ? updated.validStaked : updated.falseStaked;
      const odds = winSidePool > 0 ? updated.totalStaked / winSidePool : 1;
      const xp = xpForCorrectPrediction(pendingStake, odds);
      setEarnedXP(xp);
      saveObserverXP(walletAddress, xp);
      setPosition({ signalId: signal.id, side: pendingSide, amount: pendingStake, potentialPayout: computePotentialPayout(pendingStake, pendingSide, updated), status: 'pending' });
      setStep('done');
      onPredicted?.(pendingSide, xp);
    } catch {
      setStep('error');
      setTimeout(() => setStep('view'), 2500);
    }
  }, [walletAddress, pendingSide, pendingStake, signal, onPredicted]);

  const resetFlow = () => {
    setStep('view');
    setPendingSide(null);
    setPendingStake(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COMPACT MODE — just ratio strip + quick predict access
  // ─────────────────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Mini ratio bar */}
        <div className="flex-1 flex h-1.5 rounded-full overflow-hidden gap-px">
          <div className="rounded-l-full transition-all duration-500"
            style={{ width: `${validPct}%`, background: SIDE_CONFIG.VALID.color, opacity: 0.7 }} />
          <div className="rounded-r-full transition-all duration-500"
            style={{ width: `${falsePct}%`, background: SIDE_CONFIG.FALSE.color, opacity: 0.7 }} />
        </div>
        <span className="font-mono text-[9px] text-green-400/70">{validPct}%V</span>
        <span className="font-mono text-[9px] text-red-400/70">{falsePct}%F</span>
        {totalStaked > 0 && (
          <span className="font-mono text-[9px] text-yellow-400/60">{totalStaked} OP</span>
        )}
        {/* Outcome badge if resolved */}
        {isResolved && outcome && (
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: `${SIDE_CONFIG[outcome].color}18`, color: SIDE_CONFIG[outcome].color, border: `1px solid ${SIDE_CONFIG[outcome].color}30` }}>
            {SIDE_CONFIG[outcome].icon} {outcome}
          </span>
        )}
        {/* Position badge if user predicted */}
        {position && !isResolved && (
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded"
            style={{ background: `${SIDE_CONFIG[position.side].color}15`, color: SIDE_CONFIG[position.side].color }}>
            {SIDE_CONFIG[position.side].icon} {position.amount} OP
          </span>
        )}
        {/* Button */}
        {!position && isOpen && (
          <button
            onClick={() => setExpanded(e => !e)}
            disabled={!isConnected}
            className="font-mono text-[9px] px-2 py-1 rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
            style={{
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.2)',
              color: '#00e5ff',
            }}>
            📊 PREDICT
          </button>
        )}
        {position?.status === 'won' && (
          <span className="font-mono text-[9px] text-green-400">+{position.potentialPayout.toFixed(1)} OP ✓</span>
        )}
        {position?.status === 'lost' && (
          <span className="font-mono text-[9px] text-red-400/60">Lost {position.amount} OP</span>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FULL PANEL MODE
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(6,14,44,0.99), rgba(16,6,34,0.99))',
        borderColor: isResolved
          ? `${SIDE_CONFIG[outcome ?? 'VALID'].color}30`
          : 'rgba(0,229,255,0.2)',
      }}>

      {/* Top stripe */}
      <div className="h-0.5" style={{
        background: isResolved
          ? `linear-gradient(90deg, transparent, ${SIDE_CONFIG[outcome ?? 'VALID'].color}, transparent)`
          : 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
      }} />

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <div className="font-display text-xs text-cyan-400 tracking-widest font-bold">PREDICTION MARKET</div>
            <div className="font-mono text-[9px] text-purple-400/40 mt-0.5">
              {signal.type.replace(/_/g, ' ')} · {signal.nodeName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Countdown / status */}
          {isResolved ? (
            <span className="font-mono text-[10px] px-2 py-1 rounded"
              style={{ background: 'rgba(123,46,200,0.15)', color: 'rgba(180,160,240,0.6)' }}>
              RESOLVED
            </span>
          ) : (
            <span className="font-mono text-[10px] px-2 py-1 rounded flex items-center gap-1.5"
              style={{
                background: msLeft < 60_000 ? 'rgba(255,23,68,0.12)' : 'rgba(0,229,255,0.08)',
                color: msLeft < 60_000 ? '#ff6b6b' : '#00e5ff',
                border: `1px solid ${msLeft < 60_000 ? 'rgba(255,23,68,0.3)' : 'rgba(0,229,255,0.2)'}`,
              }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                style={{ background: msLeft < 60_000 ? '#ff1744' : '#00e5ff' }} />
              {isOpen ? formatCountdown(msLeft) : 'CLOSED'}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">

        {/* ── Prediction ratio bars ── */}
        <div className="space-y-2">
          {/* VALID bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold text-green-400">✓ VALID SIGNAL</span>
                {outcome === 'VALID' && <span className="font-mono text-[8px] px-1 rounded bg-green-500/20 text-green-400">OUTCOME ✓</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-green-400">{validPct}%</span>
                <span className="font-mono text-[9px] text-purple-400/40">{validStaked} OP</span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,230,118,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${validPct}%`, background: 'linear-gradient(90deg, #00e67660, #00e676)', boxShadow: '0 0 8px rgba(0,230,118,0.4)' }} />
            </div>
          </div>
          {/* FALSE bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold text-red-400">✗ FALSE SIGNAL</span>
                {outcome === 'FALSE' && <span className="font-mono text-[8px] px-1 rounded bg-red-500/20 text-red-400">OUTCOME ✓</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-red-400">{falsePct}%</span>
                <span className="font-mono text-[9px] text-purple-400/40">{falseStaked} OP</span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,23,68,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${falsePct}%`, background: 'linear-gradient(90deg, #ff174460, #ff1744)', boxShadow: '0 0 8px rgba(255,23,68,0.4)' }} />
            </div>
          </div>
        </div>

        {/* Pool summary */}
        <div className="flex items-center gap-3 py-2 rounded-lg px-3"
          style={{ background: 'rgba(123,46,200,0.06)', border: '1px solid rgba(123,46,200,0.15)' }}>
          <div className="text-center flex-1">
            <div className="font-mono text-sm font-bold text-yellow-400">{totalStaked} OP</div>
            <div className="font-mono text-[9px] text-purple-400/40 mt-0.5">TOTAL POOL</div>
          </div>
          <div className="w-px h-8 bg-purple-500/20" />
          <div className="text-center flex-1">
            <div className="font-mono text-sm font-bold text-cyan-400">{(market?.validCount ?? 0) + (market?.falseCount ?? 0)}</div>
            <div className="font-mono text-[9px] text-purple-400/40 mt-0.5">PREDICTORS</div>
          </div>
          <div className="w-px h-8 bg-purple-500/20" />
          <div className="text-center flex-1">
            <div className="font-mono text-[10px] font-bold"
              style={{ color: sevColor }}>
              {signal.severity}
            </div>
            <div className="font-mono text-[9px] text-purple-400/40 mt-0.5">SEVERITY</div>
          </div>
        </div>

        {/* ── USER POSITION (already predicted) ── */}
        {position && (
          <div className="rounded-xl p-3 border"
            style={{
              background: position.status === 'won'
                ? 'rgba(0,230,118,0.06)'
                : position.status === 'lost'
                ? 'rgba(255,23,68,0.06)'
                : `${SIDE_CONFIG[position.side].color}06`,
              borderColor: position.status === 'won'
                ? 'rgba(0,230,118,0.3)'
                : position.status === 'lost'
                ? 'rgba(255,23,68,0.3)'
                : `${SIDE_CONFIG[position.side].color}25`,
            }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] text-purple-400/40 tracking-wider mb-1">YOUR POSITION</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold"
                    style={{ color: SIDE_CONFIG[position.side].color }}>
                    {SIDE_CONFIG[position.side].icon} {SIDE_CONFIG[position.side].label}
                  </span>
                  <span className="font-mono text-[10px] text-yellow-400">{position.amount} OP staked</span>
                </div>
              </div>
              <div className="text-right">
                {position.status === 'pending' && (
                  <div>
                    <div className="font-mono text-xs text-yellow-400 font-bold">{position.potentialPayout.toFixed(1)} OP</div>
                    <div className="font-mono text-[9px] text-purple-400/40">potential payout</div>
                  </div>
                )}
                {position.status === 'won' && (
                  <div>
                    <div className="font-mono text-sm text-green-400 font-bold">+{position.potentialPayout.toFixed(1)} OP ✓</div>
                    <div className="font-mono text-[9px] text-green-400/60">CORRECT · WINNER</div>
                  </div>
                )}
                {position.status === 'lost' && (
                  <div>
                    <div className="font-mono text-sm text-red-400 font-bold">-{position.amount} OP</div>
                    <div className="font-mono text-[9px] text-red-400/60">INCORRECT</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── RESOLVED OUTCOME BANNER ── */}
        {isResolved && outcome && !position && (
          <div className="rounded-xl p-3 border text-center"
            style={{
              background: `${SIDE_CONFIG[outcome].color}08`,
              borderColor: `${SIDE_CONFIG[outcome].color}30`,
            }}>
            <div className="font-mono text-[9px] text-purple-400/40 tracking-wider mb-1">MARKET RESOLVED</div>
            <div className="font-display text-sm font-bold" style={{ color: SIDE_CONFIG[outcome].color }}>
              {SIDE_CONFIG[outcome].icon} {SIDE_CONFIG[outcome].label}
            </div>
          </div>
        )}

        {/* ── TRANSACTION FLOW ── */}

        {/* Step: view → choose side */}
        {step === 'view' && canPredict && (
          <div className="grid grid-cols-2 gap-2">
            {(['VALID', 'FALSE'] as PredictionSide[]).map(side => (
              <button key={side}
                onClick={() => { setPendingSide(side); setStep('select-stake'); }}
                className="py-3 rounded-xl font-display text-xs tracking-widest transition-all hover:opacity-90"
                style={{
                  background: SIDE_CONFIG[side].bg,
                  border: `1px solid ${SIDE_CONFIG[side].color}40`,
                  color: SIDE_CONFIG[side].color,
                  boxShadow: `0 0 16px ${SIDE_CONFIG[side].color}10`,
                }}>
                {SIDE_CONFIG[side].icon} {SIDE_CONFIG[side].short}
              </button>
            ))}
          </div>
        )}

        {/* Step: select stake amount */}
        {step === 'select-stake' && pendingSide && (
          <div className="rounded-xl border p-3 space-y-3"
            style={{ background: `${SIDE_CONFIG[pendingSide].color}05`, borderColor: `${SIDE_CONFIG[pendingSide].color}25` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] text-purple-400/40 tracking-wider">STAKING ON</div>
                <div className="font-mono text-xs font-bold mt-0.5" style={{ color: SIDE_CONFIG[pendingSide].color }}>
                  {SIDE_CONFIG[pendingSide].icon} {SIDE_CONFIG[pendingSide].label}
                </div>
              </div>
              <button onClick={resetFlow}
                className="w-6 h-6 rounded flex items-center justify-center text-purple-400/40 hover:text-purple-300 transition-colors text-xs">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {STAKE_TIERS.map(tier => (
                <button key={tier.amount}
                  onClick={() => setPendingStake(tier.amount)}
                  className="py-2 rounded-lg font-mono text-xs font-bold transition-all"
                  style={{
                    background: pendingStake === tier.amount ? `${tier.color}20` : 'rgba(123,46,200,0.08)',
                    border: `1px solid ${pendingStake === tier.amount ? tier.color : 'rgba(123,46,200,0.2)'}`,
                    color: pendingStake === tier.amount ? tier.color : 'rgba(150,130,190,0.6)',
                    boxShadow: pendingStake === tier.amount ? `0 0 10px ${tier.color}25` : 'none',
                  }}>
                  {tier.label}
                </button>
              ))}
            </div>

            {/* Potential payout preview */}
            {potentialPayout !== null && pendingStake && (
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[9px] text-purple-400/40">Est. payout if correct:</span>
                <span className="font-mono text-[10px] font-bold text-yellow-400">{potentialPayout.toFixed(2)} OP</span>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!pendingStake}
              className="w-full py-2.5 rounded-xl font-display text-xs tracking-widest transition-all disabled:opacity-40"
              style={{
                background: SIDE_CONFIG[pendingSide].bg,
                border: `1px solid ${SIDE_CONFIG[pendingSide].color}50`,
                color: SIDE_CONFIG[pendingSide].color,
              }}>
              ⛓ CONFIRM PREDICTION
            </button>
          </div>
        )}

        {/* Step: confirming */}
        {step === 'confirming' && pendingSide && (
          <TxStep label="⚡ SIGNING TRANSACTION…" color={SIDE_CONFIG[pendingSide].color} />
        )}

        {/* Step: broadcasting */}
        {step === 'broadcasting' && pendingSide && (
          <TxStep label="📡 BROADCASTING TO CHAIN…" color={SIDE_CONFIG[pendingSide].color} />
        )}

        {/* Step: done */}
        {step === 'done' && pendingSide && txHash && (
          <div className="rounded-xl border p-3 text-center"
            style={{ background: `${SIDE_CONFIG[pendingSide].color}06`, borderColor: `${SIDE_CONFIG[pendingSide].color}30` }}>
            <div className="font-display text-xs tracking-widest mb-1" style={{ color: SIDE_CONFIG[pendingSide].color }}>
              ✓ PREDICTION RECORDED
            </div>
            <div className="font-mono text-[9px] text-purple-400/40 break-all mb-1">{txHash.slice(0, 36)}…</div>
            <div className="font-mono text-xs text-yellow-400 font-bold">+{earnedXP} XP staked</div>
          </div>
        )}

        {/* Step: error */}
        {step === 'error' && (
          <div className="rounded-xl border p-3 text-center"
            style={{ background: 'rgba(255,23,68,0.06)', borderColor: 'rgba(255,23,68,0.3)' }}>
            <div className="font-mono text-xs text-red-400">✕ TRANSACTION FAILED — RETRY</div>
          </div>
        )}

        {/* Not connected prompt */}
        {!isConnected && isOpen && !position && (
          <div className="text-center font-mono text-[10px] text-purple-400/40 py-1">
            Connect wallet to predict
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: transaction step with shimmer
// ─────────────────────────────────────────────────────────────────────────────

function TxStep({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-xl border p-3 relative overflow-hidden"
      style={{ background: `${color}06`, borderColor: `${color}25` }}>
      <div className="absolute inset-0 overflow-hidden">
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, transparent, ${color}15, transparent)`,
          animation: 'shimmer 1.1s ease-in-out infinite',
        }} />
      </div>
      <div className="relative font-mono text-[10px] text-center" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
