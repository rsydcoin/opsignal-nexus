'use client';

import { useState, useEffect, useMemo } from 'react';
import HUD from '@/components/HUD';
import PredictionPanel from '@/components/PredictionPanel';
import { useWallet } from '@/lib/walletContext';
import {
  seedDemoMarkets, SeedMarket,
  getUserPredictions, PredictionRecord,
  loadMarketState, computeUserStats, UserPredictionStats,
  SIDE_CONFIG, STAKE_TIERS, getPredictionLeaderboard, PredictorEntry,
  computePayout, MarketState, formatCountdown, msUntilExpiry,
} from '@/lib/predictionMarket';
import { AnomalyEvent } from '@/lib/signalEngine';
import { saveObserverXP } from '@/lib/opnetSignals';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PageTab  = 'markets' | 'history' | 'leaderboard';
type MktFilter = 'ALL' | 'OPEN' | 'RESOLVED';

const SEV_COLOR: Record<string, string> = {
  LOW: '#00e676', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#ff1744',
};

const RANK_ICONS = ['👑', '🥈', '🥉'];

// ─────────────────────────────────────────────────────────────────────────────
// Build AnomalyEvent shells from SeedMarket data (for PredictionPanel)
// ─────────────────────────────────────────────────────────────────────────────

function marketToSignal(m: SeedMarket): AnomalyEvent {
  return {
    id:        m.signalId,
    nodeId:    m.nodeName.toLowerCase().split(' ')[1] ?? 'alpha',
    nodeName:  m.nodeName,
    type:      m.signalType,
    severity:  m.severity,
    timestamp: m.expiresAt - 5 * 60 * 1000,
    value:     0,
    resolved:  m.status === 'RESOLVED',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
  const { walletAddress, isConnected, connectWallet } = useWallet();

  const [tab,        setTab]        = useState<PageTab>('markets');
  const [mktFilter,  setMktFilter]  = useState<MktFilter>('ALL');
  const [markets,    setMarkets]    = useState<SeedMarket[]>([]);
  const [history,    setHistory]    = useState<PredictionRecord[]>([]);
  const [userStats,  setUserStats]  = useState<UserPredictionStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<PredictorEntry[]>([]);
  const [ticker,     setTicker]     = useState(0);    // seconds clock for countdowns
  const [xpEarned,   setXpEarned]   = useState(0);

  // ── Seed demo markets once ─────────────────────────────────────────────────
  useEffect(() => {
    setMarkets(seedDemoMarkets(12));
  }, []);

  // ── Clock tick for countdowns ──────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTicker(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Load user data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) { setHistory([]); setUserStats(null); return; }
    const preds = getUserPredictions(walletAddress);
    setHistory(preds);
    const stats = computeUserStats(walletAddress);
    setUserStats(stats);
    setLeaderboard(getPredictionLeaderboard(stats));
  }, [walletAddress, ticker]);

  // ── Update leaderboard without user ───────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) {
      setLeaderboard(getPredictionLeaderboard(undefined));
    }
  }, [walletAddress]);

  const handlePredicted = (_side: string, xp: number) => {
    setXpEarned(prev => prev + xp);
    if (walletAddress) saveObserverXP(walletAddress, xp);
    // Refresh markets list to pick up the new stake
    setMarkets(seedDemoMarkets(12));
  };

  // ── Filtered markets ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return markets.filter(m => {
      if (mktFilter === 'OPEN')     return m.status === 'OPEN';
      if (mktFilter === 'RESOLVED') return m.status === 'RESOLVED';
      return true;
    });
  }, [markets, mktFilter]);

  const openCount     = markets.filter(m => m.status === 'OPEN').length;
  const resolvedCount = markets.filter(m => m.status === 'RESOLVED').length;
  const totalPoolOP   = markets.reduce((s, m) => s + m.totalStaked, 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020818]">
      <HUD />

      {/* Grid bg */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }} />

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-ui text-sm text-purple-400 hover:text-yellow-400 transition-colors">← Hub</Link>
            <div>
              <h1 className="font-display text-2xl text-yellow-400 tracking-widest">📊 PREDICTION MARKET</h1>
              <p className="font-mono text-[10px] text-purple-400/50 tracking-wider mt-0.5">
                Stake OP · Predict outcomes · Earn rewards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {xpEarned > 0 && (
              <div className="font-mono text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', color: '#00e676' }}>
                +{xpEarned} XP this session
              </div>
            )}
            {!isConnected && (
              <button onClick={connectWallet}
                className="px-4 py-2 rounded-lg font-display text-xs tracking-widest transition-all"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                ⚡ CONNECT
              </button>
            )}
          </div>
        </div>

        {/* ── Summary strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SumCard icon="🟢" label="OPEN MARKETS"    value={openCount}                    color="#00e676" />
          <SumCard icon="✅" label="RESOLVED"         value={resolvedCount}                color="#a78bfa" />
          <SumCard icon="◈"  label="TOTAL POOL"       value={`${totalPoolOP} OP`}          color="#fbbf24" />
          <SumCard icon="🎯" label="YOUR ACCURACY"    value={userStats ? `${userStats.accuracy}%` : '—'} color="#00e5ff" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl"
          style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)' }}>
          {(['markets', 'history', 'leaderboard'] as PageTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg font-display text-xs tracking-widest transition-all capitalize"
              style={{
                background: tab === t ? 'rgba(0,229,255,0.12)' : 'transparent',
                border: tab === t ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent',
                color: tab === t ? '#00e5ff' : 'rgba(150,130,190,0.5)',
              }}>
              {t === 'markets' ? '📊 Markets' : t === 'history' ? '📜 My History' : '🏆 Leaderboard'}
            </button>
          ))}
        </div>

        {/* ── MARKETS TAB ── */}
        {tab === 'markets' && (
          <>
            {/* Filter pills */}
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-[10px] text-purple-400/40 tracking-widest">FILTER</span>
              {(['ALL', 'OPEN', 'RESOLVED'] as MktFilter[]).map(f => (
                <button key={f} onClick={() => setMktFilter(f)}
                  className="font-mono text-[10px] px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: mktFilter === f ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.04)',
                    border: `1px solid ${mktFilter === f ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.12)'}`,
                    color: mktFilter === f ? '#00e5ff' : 'rgba(150,130,190,0.5)',
                  }}>
                  {f}
                </button>
              ))}
            </div>

            {/* Market grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(market => (
                <MarketCard
                  key={market.signalId}
                  market={market}
                  walletAddress={walletAddress}
                  isConnected={isConnected}
                  ticker={ticker}
                  onPredicted={handlePredicted}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="text-4xl mb-3">📊</div>
                <div className="font-display text-yellow-400/60 tracking-widest">NO MARKETS MATCH FILTER</div>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div>
            {!isConnected ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">📜</div>
                <div className="font-display text-yellow-400/60 tracking-widest mb-3">CONNECT TO VIEW HISTORY</div>
                <button onClick={connectWallet}
                  className="px-5 py-2.5 rounded-xl font-display text-xs tracking-widest transition-all"
                  style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                  ⚡ CONNECT WALLET
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-3">📊</div>
                <div className="font-display text-yellow-400/60 tracking-widest mb-2">NO PREDICTIONS YET</div>
                <p className="font-body italic text-purple-400/40 text-sm">
                  Visit the Markets tab to start predicting signals.
                </p>
              </div>
            ) : (
              <>
                {/* User stats banner */}
                {userStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <StatCard label="PREDICTIONS"  value={userStats.totalPredictions.toString()} color="#00e5ff" />
                    <StatCard label="ACCURACY"     value={`${userStats.accuracy}%`}              color="#00e676" />
                    <StatCard label="TOTAL WON"    value={`${userStats.totalWon.toFixed(1)} OP`} color="#fbbf24" />
                    <StatCard label="NET PROFIT"   value={`${userStats.netProfit >= 0 ? '+' : ''}${userStats.netProfit.toFixed(1)}`} color={userStats.netProfit >= 0 ? '#00e676' : '#ff6b6b'} />
                  </div>
                )}

                {/* History list */}
                <div className="rounded-xl border overflow-hidden"
                  style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(0,229,255,0.15)' }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
                    <div className="font-mono text-[9px] text-cyan-400/60 tracking-widest">
                      PREDICTION HISTORY · {history.length} records
                    </div>
                    {userStats && (
                      <div className="font-mono text-[9px] text-purple-400/40">
                        Streak: {userStats.currentStreak} · Best: {userStats.bestStreak}
                      </div>
                    )}
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(0,229,255,0.06)' }}>
                    {history.slice(0, 30).map(record => {
                      const market = loadMarketState(record.signalId);
                      const isResolved = market?.status === 'RESOLVED';
                      const won = isResolved && market?.outcome === record.side;
                      const lost = isResolved && market?.outcome !== record.side;
                      const payout = (isResolved && won && market) ? computePayout(record, market as MarketState).payout : null;
                      const sideConf = SIDE_CONFIG[record.side];
                      const ts = new Date(record.timestamp);
                      return (
                        <div key={record.id} className="px-4 py-3 flex items-center gap-3">
                          {/* Side icon */}
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
                            style={{ background: `${sideConf.color}12`, border: `1px solid ${sideConf.color}25`, color: sideConf.color }}>
                            {sideConf.icon}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold" style={{ color: sideConf.color }}>
                                {sideConf.label}
                              </span>
                              <span className="font-mono text-[9px] text-yellow-400">{record.amount} OP staked</span>
                              {isResolved && (
                                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold"
                                  style={{
                                    background: won ? 'rgba(0,230,118,0.12)' : 'rgba(255,23,68,0.12)',
                                    color: won ? '#00e676' : '#ff6b6b',
                                    border: `1px solid ${won ? 'rgba(0,230,118,0.3)' : 'rgba(255,23,68,0.3)'}`,
                                  }}>
                                  {won ? `WON +${payout?.toFixed(1)} OP` : 'LOST'}
                                </span>
                              )}
                              {!isResolved && (
                                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff' }}>
                                  PENDING
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[9px] text-purple-400/40 truncate">
                                {record.signalId.replace('demo_sig_', 'Signal #')}
                              </span>
                              <span className="font-mono text-[9px] text-purple-500/30">
                                {ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            </div>
                          </div>

                          {/* Tx hash */}
                          <div className="flex-shrink-0 text-right hidden sm:block">
                            <div className="font-mono text-[8px] text-purple-400/25 max-w-[80px] truncate">
                              {record.txHash.slice(0, 14)}…
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {tab === 'leaderboard' && (
          <div>
            {/* Top 3 spotlight */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {leaderboard.slice(0, 3).map((entry, i) => (
                <div key={entry.address + i}
                  className="rounded-xl border p-4 text-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(7,17,51,0.97), rgba(16,6,34,0.97))',
                    borderColor: i === 0 ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.15)',
                    boxShadow:   i === 0 ? '0 0 30px rgba(0,229,255,0.1)' : 'none',
                  }}>
                  {i === 0 && (
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.07), transparent 60%)' }} />
                  )}
                  <div className="text-3xl mb-2">{RANK_ICONS[i]}</div>
                  <div className="font-mono text-[10px] text-purple-300/70 truncate mb-2">{entry.address}</div>
                  <div className="font-mono text-xl font-bold text-cyan-400 mb-0.5">{entry.accuracy}%</div>
                  <div className="font-mono text-[9px] text-purple-400/40 mb-2">ACCURACY</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded p-1 text-center" style={{ background: 'rgba(0,229,255,0.06)' }}>
                      <div className="font-mono text-[10px] text-cyan-400">{entry.predictions}</div>
                      <div className="font-mono text-[8px] text-purple-400/40">preds</div>
                    </div>
                    <div className="rounded p-1 text-center" style={{ background: 'rgba(251,191,36,0.06)' }}>
                      <div className="font-mono text-[10px] text-yellow-400">{entry.totalWon.toFixed(0)} OP</div>
                      <div className="font-mono text-[8px] text-purple-400/40">won</div>
                    </div>
                  </div>
                  {entry.streak > 0 && (
                    <div className="mt-2 font-mono text-[9px] text-orange-400/70">🔥 {entry.streak} streak</div>
                  )}
                </div>
              ))}
            </div>

            {/* Full table */}
            <div className="rounded-xl border overflow-hidden"
              style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(0,229,255,0.15)' }}>
              <div className="px-4 py-3 border-b bg-cyan-900/10"
                style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
                <div className="font-display text-xs text-cyan-400/70 tracking-widest">TOP PREDICTORS — SEASON I</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(0,229,255,0.08)' }}>
                      {['#', 'WALLET', 'ACCURACY', 'PREDICTIONS', 'CORRECT', 'WON (OP)', 'NET', 'STREAK'].map(h => (
                        <th key={h} className="font-mono text-[9px] text-purple-400/50 px-4 py-2 text-left tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const isMe = entry.isUser;
                      return (
                        <tr key={entry.address + i}
                          className="border-b transition-colors hover:bg-cyan-900/10"
                          style={{ borderColor: 'rgba(0,229,255,0.05)', background: isMe ? 'rgba(0,229,255,0.04)' : undefined }}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm" style={{ color: i < 3 ? '#fbbf24' : 'rgba(100,78,184,0.8)' }}>
                              {i < 3 ? RANK_ICONS[i] : `#${entry.rank}`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs" style={{ color: isMe ? '#fbbf24' : 'rgba(200,180,240,0.8)' }}>
                              {entry.address}
                              {isMe && <span className="ml-2 text-yellow-500 text-[9px]">(YOU)</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,229,255,0.12)' }}>
                                <div className="h-full rounded-full"
                                  style={{ width: `${entry.accuracy}%`, background: entry.accuracy >= 80 ? '#00e676' : entry.accuracy >= 65 ? '#fbbf24' : '#fb923c' }} />
                              </div>
                              <span className="font-mono text-xs font-bold text-cyan-400">{entry.accuracy}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-purple-300/80">{entry.predictions}</td>
                          <td className="px-4 py-3 font-mono text-xs text-green-400">{entry.correct}</td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-yellow-400">{entry.totalWon.toFixed(1)}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: entry.netProfit >= 0 ? '#00e676' : '#ff6b6b' }}>
                            {entry.netProfit >= 0 ? '+' : ''}{entry.netProfit.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-orange-400">
                            {entry.streak > 0 ? `🔥${entry.streak}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accuracy tiers */}
            <div className="mt-5 rounded-xl border p-4"
              style={{ background: 'rgba(7,17,51,0.95)', borderColor: 'rgba(0,229,255,0.12)' }}>
              <div className="font-display text-xs text-cyan-400/60 tracking-widest mb-3">ACCURACY TIERS</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Novice',    range: '0–49%',   color: '#a78bfa', icon: '🔮' },
                  { label: 'Analyst',   range: '50–69%',  color: '#00e5ff', icon: '📊' },
                  { label: 'Strategist',range: '70–84%',  color: '#fbbf24', icon: '🎯' },
                  { label: 'Oracle',    range: '85–100%', color: '#ff6d00', icon: '🏆' },
                ].map(tier => (
                  <div key={tier.label} className="rounded-lg p-3 border text-center"
                    style={{ borderColor: `${tier.color}25`, background: `${tier.color}08` }}>
                    <div className="text-xl mb-1">{tier.icon}</div>
                    <div className="font-display text-xs font-bold mb-0.5" style={{ color: tier.color }}>{tier.label}</div>
                    <div className="font-mono text-[9px] text-purple-400/50">{tier.range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer lore */}
        <div className="mt-10 text-center">
          <div className="h-px max-w-xs mx-auto mb-3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.2), transparent)' }} />
          <p className="font-body italic text-purple-400/25 text-xs">
            "In the prediction market, knowledge is collateral and accuracy is currency."
          </p>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MarketCard — individual card on the markets tab
// ─────────────────────────────────────────────────────────────────────────────

interface MarketCardProps {
  market: SeedMarket;
  walletAddress: string | null;
  isConnected: boolean;
  ticker: number;
  onPredicted: (side: string, xp: number) => void;
}

function MarketCard({ market, walletAddress, isConnected, ticker, onPredicted }: MarketCardProps) {
  const [open, setOpen] = useState(false);

  const signal = marketToSignal(market);
  const isResolved = market.status === 'RESOLVED';
  const isOpen     = market.status === 'OPEN';
  const sevColor   = SEV_COLOR[market.severity] ?? '#c087f5';
  const total      = market.totalStaked;
  const vPct       = total > 0 ? Math.round((market.validStaked / total) * 100) : 50;
  const fPct       = 100 - vPct;
  const msLeft     = msUntilExpiry(market.expiresAt);

  return (
    <div className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: 'linear-gradient(145deg, rgba(7,17,51,0.97), rgba(12,6,28,0.97))',
        borderColor: isResolved ? 'rgba(123,46,200,0.2)' : 'rgba(0,229,255,0.2)',
        boxShadow: open ? '0 0 20px rgba(0,229,255,0.08)' : 'none',
      }}>

      {/* Status stripe */}
      <div className="h-0.5" style={{
        background: isResolved
          ? `linear-gradient(90deg, transparent, ${market.outcome ? SIDE_CONFIG[market.outcome].color : '#a78bfa'}, transparent)`
          : 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
      }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold" style={{ color: sevColor }}>
                {market.signalType.replace(/_/g, ' ')}
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: `${sevColor}12`, color: sevColor, border: `1px solid ${sevColor}25` }}>
                {market.severity}
              </span>
              {isResolved && market.outcome && (
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: `${SIDE_CONFIG[market.outcome].color}15`, color: SIDE_CONFIG[market.outcome].color, border: `1px solid ${SIDE_CONFIG[market.outcome].color}30` }}>
                  {SIDE_CONFIG[market.outcome].icon} {market.outcome}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-purple-400/50">{market.nodeName}</span>
              {isOpen && msLeft > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ background: 'rgba(0,229,255,0.06)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}>
                  <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                  {formatCountdown(msLeft)}
                </span>
              )}
              {isResolved && (
                <span className="font-mono text-[9px] text-purple-400/30">RESOLVED</span>
              )}
            </div>
          </div>

          <button onClick={() => setOpen(o => !o)}
            className="flex-shrink-0 font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: open ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.05)',
              border: `1px solid ${open ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.15)'}`,
              color: '#00e5ff',
            }}>
            {open ? '▲ CLOSE' : isOpen ? '📊 PREDICT' : '📋 VIEW'}
          </button>
        </div>
      </div>

      {/* Ratio strip */}
      <div className="px-4 pb-3">
        <div className="flex h-2 rounded-full overflow-hidden gap-px mb-1.5">
          <div className="h-full rounded-l-full transition-all duration-700"
            style={{ width: `${vPct}%`, background: 'linear-gradient(90deg, #00e67650, #00e676)' }} />
          <div className="h-full rounded-r-full transition-all duration-700"
            style={{ width: `${fPct}%`, background: 'linear-gradient(90deg, #ff174450, #ff1744)' }} />
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono">
          <div className="flex items-center gap-3">
            <span className="text-green-400">✓ VALID {vPct}%</span>
            <span className="text-red-400">✗ FALSE {fPct}%</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400/50">
            <span>{total} OP pooled</span>
            <span>·</span>
            <span>{market.validCount + market.falseCount} predictors</span>
          </div>
        </div>
      </div>

      {/* Full prediction panel */}
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
          <div className="pt-3">
            <PredictionPanel signal={signal} onPredicted={onPredicted} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-components
// ─────────────────────────────────────────────────────────────────────────────

function SumCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl px-3 py-3 border text-center"
      style={{ background: 'rgba(7,17,51,0.9)', borderColor: `${color}20` }}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-mono text-base font-bold leading-none" style={{ color }}>{value}</div>
      <div className="font-mono text-[9px] text-purple-400/50 tracking-wider mt-1">{label}</div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl px-3 py-3 border text-center"
      style={{ background: 'rgba(7,17,51,0.9)', borderColor: `${color}20` }}>
      <div className="font-mono text-lg font-bold leading-none" style={{ color }}>{value}</div>
      <div className="font-mono text-[9px] text-purple-400/50 tracking-wider mt-1">{label}</div>
    </div>
  );
}
