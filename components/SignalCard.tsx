'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnomalyEvent } from '@/lib/signalEngine';
import { analyzeSignal, confidenceColor, classifyRarity, RARITY_CONFIG, AIAnalysis } from '@/lib/aiSignals';
import { rewardSignal, getSignalRewards, seedMockRewards, SignalRewardSummary, REWARD_TIERS, RewardTier, xpForReward } from '@/lib/rewards';
import { getReputationLevel, getLevelColor, getLevelIcon } from '@/lib/reputation';
import { useWallet } from '@/lib/walletContext';
import PredictionPanel from '@/components/PredictionPanel';
import {
  PredictionSide,
  loadMarketState, getUserPositionForSignal,
  computeMarketStatus, msUntilExpiry, formatCountdown,
  SIDE_CONFIG,
} from '@/lib/predictionMarket';

interface SignalCardProps {
  signal: AnomalyEvent;
  contributor?:       string;
  contributorScore?:  number;
  mockRewardBase?:    number;
  onRewardSent?:      (xp: number) => void;
  onPredicted?:       (side: PredictionSide, xp: number) => void;
  compact?:           boolean;
  showPrediction?:    boolean;
}

const SEV_COLOR: Record<string, string> = {
  LOW: '#00e676', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#ff1744',
};

const MOCK_CONTRIBUTORS: Record<string, { address: string; score: number }> = {
  alpha: { address: '0xA1b2\u2026C3d4', score: 4280 },
  beta:  { address: '0xE5f6\u2026G7h8', score: 3140 },
  gamma: { address: '0xI9j0\u2026K1l2', score: 2290 },
  delta: { address: '0xM3n4\u2026O5p6', score: 1640 },
};

export default function SignalCard({
  signal,
  contributor,
  contributorScore,
  mockRewardBase,
  onRewardSent,
  onPredicted,
  compact = false,
  showPrediction = true,
}: SignalCardProps) {
  const { walletAddress, isConnected } = useWallet();

  const analysis: AIAnalysis = analyzeSignal({
    id: signal.id, type: signal.type,
    severity: signal.severity, nodeId: signal.nodeId, timestamp: signal.timestamp,
  });

  const rarity     = classifyRarity(signal.severity, analysis.confidenceScore);
  const rarityConf = RARITY_CONFIG[rarity];
  const sevColor   = SEV_COLOR[signal.severity] ?? '#c087f5';

  const mock         = MOCK_CONTRIBUTORS[signal.nodeId] ?? MOCK_CONTRIBUTORS.alpha;
  const contribAddr  = contributor      ?? mock.address;
  const contribScore = contributorScore ?? mock.score;
  const contribLevel = getReputationLevel(contribScore);
  const contribColor = getLevelColor(contribLevel);
  const contribIcon  = getLevelIcon(contribLevel);

  const [rewards,      setRewards]      = useState<SignalRewardSummary | null>(null);
  const [rewardStatus, setRewardStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [selectedTier, setSelectedTier] = useState<RewardTier | null>(null);
  const [showReward,   setShowReward]   = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [predTab,      setPredTab]      = useState(false);

  const [marketSummary, setMarketSummary] = useState<{
    totalStaked: number; validPct: number; falsePct: number;
    status: string; msLeft: number; outcome: PredictionSide | null;
    userSide: PredictionSide | null;
  } | null>(null);

  useEffect(() => {
    const live = getSignalRewards(signal.id);
    if (live.totalOP > 0) {
      setRewards(live);
    } else if (mockRewardBase !== undefined) {
      setRewards(seedMockRewards(signal.id, mockRewardBase, Math.max(1, Math.floor(mockRewardBase / 4))));
    } else {
      setRewards({ signalId: signal.id, totalOP: 0, rewardCount: 0, topSupporters: [], lastRewarded: null });
    }
  }, [signal.id, mockRewardBase]);

  useEffect(() => {
    const refresh = () => {
      const m = loadMarketState(signal.id);
      if (!m) { setMarketSummary(null); return; }
      const st    = computeMarketStatus(m.expiresAt, m.status === 'RESOLVED');
      const ms    = msUntilExpiry(m.expiresAt);
      const total = m.totalStaked;
      const vPct  = total > 0 ? Math.round((m.validStaked / total) * 100) : 50;
      let userSide: PredictionSide | null = null;
      if (walletAddress) {
        const pos = getUserPositionForSignal(signal.id, walletAddress);
        userSide  = pos?.side ?? null;
      }
      setMarketSummary({ totalStaked: total, validPct: vPct, falsePct: 100 - vPct, status: st, msLeft: ms, outcome: m.outcome, userSide });
    };
    refresh();
    const tid = setInterval(refresh, 1000);
    return () => clearInterval(tid);
  }, [signal.id, walletAddress]);

  const handleReward = useCallback(async () => {
    if (!walletAddress || !selectedTier || rewardStatus !== 'idle') return;
    setRewardStatus('pending');
    try {
      await rewardSignal(signal.id, selectedTier, walletAddress);
      setRewards(getSignalRewards(signal.id));
      setRewardStatus('done');
      setShowReward(false);
      onRewardSent?.(xpForReward(selectedTier));
      setTimeout(() => setRewardStatus('idle'), 3000);
    } catch {
      setRewardStatus('error');
      setTimeout(() => setRewardStatus('idle'), 2000);
    }
  }, [walletAddress, selectedTier, rewardStatus, signal.id, onRewardSent]);

  const handlePredicted = (side: PredictionSide, xp: number) => {
    onPredicted?.(side, xp);
    setPredTab(false);
    const m = loadMarketState(signal.id);
    if (m) {
      const total = m.totalStaked;
      const vPct  = total > 0 ? Math.round((m.validStaked / total) * 100) : 50;
      setMarketSummary(prev => prev ? { ...prev, totalStaked: total, validPct: vPct, falsePct: 100 - vPct, userSide: side } : prev);
    }
  };

  const confColor  = confidenceColor(analysis.confidenceScore);
  const timeStr    = new Date(signal.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const hasMarket  = marketSummary !== null && marketSummary.totalStaked > 0;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{
        background:  'linear-gradient(145deg, rgba(7,17,51,0.98) 0%, rgba(18,8,36,0.98) 100%)',
        borderColor: predTab ? 'rgba(0,229,255,0.35)' : `${sevColor}30`,
        boxShadow:   expanded || predTab ? `0 0 24px ${rarityConf.glow}` : 'none',
      }}
    >
      {/* Rarity bar */}
      <div className="h-0.5" style={{
        background: `linear-gradient(90deg, transparent, ${rarityConf.color}, transparent)`,
        opacity: rarity === 'COMMON' ? 0.4 : 1,
      }} />

      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="relative flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold"
            style={{ background: rarityConf.bg, border: `1px solid ${rarityConf.color}30`, color: rarityConf.color }}>
            {rarityConf.icon}
          </div>
          {signal.severity === 'CRITICAL' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold" style={{ color: sevColor }}>
              {signal.type.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: rarityConf.bg, color: rarityConf.color, border: `1px solid ${rarityConf.color}30` }}>
              {rarityConf.label}
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${sevColor}12`, color: sevColor, border: `1px solid ${sevColor}25` }}>
              {signal.severity}
            </span>
            {marketSummary?.outcome && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: `${SIDE_CONFIG[marketSummary.outcome].color}15`, color: SIDE_CONFIG[marketSummary.outcome].color, border: `1px solid ${SIDE_CONFIG[marketSummary.outcome].color}30` }}>
                {SIDE_CONFIG[marketSummary.outcome].icon} {marketSummary.outcome}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="font-mono text-[10px] text-purple-400/60">{signal.nodeName}</span>
            <span className="font-mono text-[10px] text-purple-500/40">{timeStr}</span>
            {marketSummary && marketSummary.status === 'OPEN' && marketSummary.msLeft > 0 && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.18)' }}>
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                {formatCountdown(marketSummary.msLeft)}
              </span>
            )}
          </div>
        </div>

        <button onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
          style={{ color: 'rgba(150,130,190,0.4)', fontSize: 10 }}>
          {expanded ? '\u25b2' : '\u25bc'}
        </button>
      </div>

      {/* AI Confidence bar */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[9px] text-purple-400/50 tracking-wider">AI CONFIDENCE</span>
          <span className="font-mono text-[10px] font-bold" style={{ color: confColor }}>{analysis.confidenceScore}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(123,46,200,0.15)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${analysis.confidenceScore}%`, background: `linear-gradient(90deg, ${confColor}80, ${confColor})`, boxShadow: `0 0 6px ${confColor}50` }} />
        </div>
      </div>

      {/* Prediction quick-strip */}
      {showPrediction && (
        <div className="px-4 pb-2">
          <div className="rounded-lg px-3 py-2 border flex items-center gap-3"
            style={{ background: 'rgba(0,229,255,0.03)', borderColor: predTab ? 'rgba(0,229,255,0.35)' : 'rgba(0,229,255,0.12)' }}>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px">
                  <div className="h-full rounded-l-full transition-all duration-500"
                    style={{ width: `${marketSummary?.validPct ?? 50}%`, background: '#00e67670' }} />
                  <div className="h-full rounded-r-full transition-all duration-500"
                    style={{ width: `${marketSummary?.falsePct ?? 50}%`, background: '#ff174470' }} />
                </div>
                <span className="font-mono text-[9px] text-green-400/80 flex-shrink-0">
                  \u2713{marketSummary?.validPct ?? 50}%
                </span>
                <span className="font-mono text-[9px] text-red-400/80 flex-shrink-0">
                  \u2717{marketSummary?.falsePct ?? 50}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-yellow-400/60">
                  {marketSummary?.totalStaked ?? 0} OP staked
                </span>
                {marketSummary?.userSide && (
                  <span className="font-mono text-[8px] px-1 rounded"
                    style={{ background: `${SIDE_CONFIG[marketSummary.userSide].color}15`, color: SIDE_CONFIG[marketSummary.userSide].color }}>
                    {SIDE_CONFIG[marketSummary.userSide].icon} your bet
                  </span>
                )}
              </div>
            </div>

            {!compact && (
              <button
                onClick={() => setPredTab(t => !t)}
                disabled={!isConnected && !hasMarket}
                className="flex-shrink-0 font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40"
                style={{
                  background: predTab ? 'rgba(0,229,255,0.15)' : 'rgba(0,229,255,0.08)',
                  border: `1px solid ${predTab ? 'rgba(0,229,255,0.45)' : 'rgba(0,229,255,0.2)'}`,
                  color: '#00e5ff',
                }}>
                {predTab ? '\u25b2 CLOSE' : marketSummary?.userSide ? '\ud83d\udc41 VIEW' : '\ud83d\udcca PREDICT'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full Prediction Panel */}
      {predTab && showPrediction && (
        <div className="px-4 pb-3">
          <PredictionPanel signal={signal} onPredicted={handlePredicted} />
        </div>
      )}

      {/* Reward strip */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 text-xs">\u25c8</span>
          <span className="font-mono text-[11px] font-bold text-yellow-400">{rewards?.totalOP ?? 0} OP</span>
          <span className="font-mono text-[10px] text-purple-400/40">{rewards?.rewardCount ?? 0} rewards</span>
        </div>

        {!compact && (
          <button
            onClick={() => setShowReward(s => !s)}
            disabled={!isConnected}
            className="ml-auto font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: rewardStatus === 'done' ? 'rgba(0,230,118,0.1)' : 'rgba(251,191,36,0.1)',
              border: `1px solid ${rewardStatus === 'done' ? 'rgba(0,230,118,0.3)' : 'rgba(251,191,36,0.25)'}`,
              color: rewardStatus === 'done' ? '#00e676' : '#fbbf24',
            }}>
            {rewardStatus === 'done' ? '\u2713 REWARDED' : rewardStatus === 'pending' ? '\u23f3 SENDING\u2026' : '\u25c8 REWARD'}
          </button>
        )}
      </div>

      {/* Reward panel */}
      {showReward && isConnected && rewardStatus === 'idle' && (
        <div className="mx-4 mb-3 rounded-xl border p-3"
          style={{ background: 'rgba(251,191,36,0.04)', borderColor: 'rgba(251,191,36,0.2)' }}>
          <div className="font-mono text-[9px] text-yellow-400/60 tracking-widest mb-2">SELECT REWARD AMOUNT</div>
          <div className="flex gap-2 mb-2.5">
            {REWARD_TIERS.map(tier => (
              <button key={tier.amount} onClick={() => setSelectedTier(tier.amount)}
                className="flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all"
                style={{
                  background: selectedTier === tier.amount ? `${tier.color}20` : 'rgba(123,46,200,0.08)',
                  border: `1px solid ${selectedTier === tier.amount ? tier.color : 'rgba(123,46,200,0.2)'}`,
                  color: selectedTier === tier.amount ? tier.color : 'rgba(150,130,190,0.6)',
                  boxShadow: selectedTier === tier.amount ? `0 0 10px ${tier.color}25` : 'none',
                }}>
                {tier.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleReward} disabled={!selectedTier}
              className="flex-1 py-2 rounded-lg font-display text-xs tracking-widest transition-all disabled:opacity-40"
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
              \u26d3 CONFIRM REWARD
            </button>
            <button onClick={() => { setShowReward(false); setSelectedTier(null); }}
              className="px-3 py-2 rounded-lg font-mono text-xs transition-all hover:bg-white/5"
              style={{ color: 'rgba(150,130,190,0.4)', border: '1px solid rgba(123,46,200,0.15)' }}>
              \u2715
            </button>
          </div>
          {selectedTier && (
            <div className="mt-2 font-mono text-[9px] text-purple-400/40 text-center">
              You earn +{xpForReward(selectedTier)} XP \u00b7 Contributor gains reputation
            </div>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'rgba(123,46,200,0.12)' }}>
          <div className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-mono text-[9px] text-cyan-400/60 tracking-widest">AI ANALYSIS</div>
              <div className="font-mono text-[9px] text-purple-400/30">{analysis.processingMs}ms \u00b7 {analysis.anomalyFrequency}\u00d7 in 24h</div>
            </div>
            <div className="rounded-lg p-3 mb-2.5" style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)' }}>
              <p className="font-body italic text-cyan-200/80 text-xs leading-relaxed">\ud83e\udd16 {analysis.insight}</p>
            </div>
            <div className="rounded-lg p-2.5" style={{ background: 'rgba(123,46,200,0.06)', border: '1px solid rgba(123,46,200,0.15)' }}>
              <p className="font-mono text-[10px] text-purple-300/70 leading-relaxed">{analysis.patternNote}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="SIMILAR"     value={`${analysis.similarSignals}`}    color="#c087f5" />
            <MiniStat label="FALSE POS %" value={`${analysis.falsePositiveRisk}%`} color="#fbbf24" />
            <MiniStat label="RISK"        value="VIEW \u2197"                      color={sevColor} />
          </div>

          <div className="rounded-lg px-3 py-2.5 flex items-start gap-2"
            style={{ background: `${sevColor}08`, border: `1px solid ${sevColor}20` }}>
            <span className="text-base flex-shrink-0">
              {signal.severity === 'CRITICAL' ? '\ud83d\udea8' : signal.severity === 'HIGH' ? '\u26a0' : '\u2139'}
            </span>
            <div>
              <div className="font-mono text-[9px] text-purple-400/50 tracking-wider mb-1">RECOMMENDATION</div>
              <p className="font-body text-xs leading-relaxed" style={{ color: `${sevColor}cc` }}>{analysis.recommendation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-purple-400/40 tracking-wider">RISK VECTOR</span>
            <span className="font-mono text-[10px]" style={{ color: sevColor }}>{analysis.riskVector}</span>
          </div>

          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 border"
            style={{ background: `${contribColor}06`, borderColor: `${contribColor}20` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
              style={{ background: `${contribColor}15`, border: `1px solid ${contribColor}30` }}>
              {contribIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]" style={{ color: contribColor }}>{contribLevel} Level</span>
                <span className="font-mono text-[9px] text-purple-400/40">Rep: {contribScore.toLocaleString()}</span>
              </div>
              <div className="font-mono text-[9px] text-purple-400/50 truncate">{contribAddr}</div>
            </div>
            <div className="font-mono text-[9px] text-purple-400/40">POSTED BY</div>
          </div>

          {rewards && rewards.topSupporters.length > 0 && (
            <div>
              <div className="font-mono text-[9px] text-purple-400/40 tracking-widest mb-2">TOP SUPPORTERS</div>
              <div className="space-y-1">
                {rewards.topSupporters.map((s, i) => (
                  <div key={s.address} className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-yellow-400/60">{i === 0 ? '\ud83d\udc51' : i === 1 ? '\ud83e\udd48' : '\ud83e\udd49'}</span>
                    <span className="text-purple-400/60 flex-1 truncate">{s.address}</span>
                    <span className="text-yellow-400 font-bold">{s.totalOP} OP</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg px-2 py-1.5 border text-center"
      style={{ borderColor: `${color}20`, background: `${color}06` }}>
      <div className="font-mono text-[10px] font-bold" style={{ color }}>{value}</div>
      <div className="font-mono text-[8px] text-purple-400/40 mt-0.5">{label}</div>
    </div>
  );
}
