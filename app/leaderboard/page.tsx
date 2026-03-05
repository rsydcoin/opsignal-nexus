'use client';

import { useMemo, useState } from 'react';
import HUD from '@/components/HUD';
import { useWallet } from '@/lib/walletContext';
import { loadObserverStats, getObserverLeaderboard, getRankColor } from '@/lib/opnetSignals';
import { getReputationLeaderboard, loadContributorProfile, getLevelColor, getLevelIcon, BADGE_CATALOG, RARITY_COLORS } from '@/lib/reputation';
import Link from 'next/link';
import { getPredictionLeaderboard, computeUserStats } from '@/lib/predictionMarket';

const RANK_ICONS = ['👑', '🥈', '🥉'];

type BoardTab = 'observer' | 'reputation' | 'predictors';

export default function LeaderboardPage() {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<BoardTab>('observer');

  const myStats = useMemo(() => {
    if (!walletAddress) return undefined;
    return loadObserverStats(walletAddress);
  }, [walletAddress]);

  const myProfile = useMemo(() => {
    if (!walletAddress) return undefined;
    return loadContributorProfile(walletAddress);
  }, [walletAddress]);

  const board       = useMemo(() => getObserverLeaderboard(myStats),     [myStats]);
  const repBoard    = useMemo(() => getReputationLeaderboard(myProfile), [myProfile]);
  const myPredStats = useMemo(() => walletAddress ? computeUserStats(walletAddress) : undefined, [walletAddress]);
  const predBoard   = useMemo(() => getPredictionLeaderboard(myPredStats), [myPredStats]);

  return (
    <div className="min-h-screen bg-[#020818]">
      <HUD />

      {/* Grid background */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.2 }}>
        <div style={{
          backgroundImage: 'linear-gradient(rgba(123,46,200,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(123,46,200,0.2) 1px, transparent 1px)',
          backgroundSize: '50px 50px', width: '100%', height: '100%',
        }} />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/observatory" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Observatory</Link>
            <div>
              <div className="font-display text-2xl text-yellow-400 tracking-widest">🏆 LEADERBOARD</div>
              <div className="font-mono text-[10px] text-purple-400/50 tracking-wider">Signal Intelligence Rankings · Season I</div>
            </div>
          </div>
          <Link href="/profile"
            className="font-mono text-xs px-3 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
            👤 My Profile →
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl"
          style={{ background: 'rgba(123,46,200,0.08)', border: '1px solid rgba(123,46,200,0.15)' }}>
          <TabBtn label="⚡ Observer XP" active={activeTab === 'observer'}   onClick={() => setActiveTab('observer')} />
          <TabBtn label="🔮 Reputation"  active={activeTab === 'reputation'} onClick={() => setActiveTab('reputation')} />
          <TabBtn label="📊 Predictors"  active={activeTab === 'predictors'} onClick={() => setActiveTab('predictors')} />
        </div>

        {/* ── OBSERVER XP BOARD ── */}
        {activeTab === 'observer' && (
          <>
            {/* Top 3 spotlight */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {board.slice(0, 3).map((entry, i) => {
                const color = getRankColor(entry.rank);
                return (
                  <div key={entry.walletAddress + i}
                    className="rounded-xl border p-4 text-center relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(7,17,51,0.95), rgba(26,10,46,0.95))',
                      borderColor: i === 0 ? 'rgba(245,158,11,0.5)' : `${color}30`,
                      boxShadow: i === 0 ? '0 0 30px rgba(245,158,11,0.12)' : 'none',
                    }}>
                    {i === 0 && (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08), transparent 60%)' }} />
                    )}
                    <div className="text-3xl mb-2">{RANK_ICONS[i]}</div>
                    <div className="font-display text-xs font-bold mb-1" style={{ color }}>#{entry.rank_num}</div>
                    <div className="font-mono text-[10px] text-purple-300 truncate mb-1">{entry.walletAddress}</div>
                    <div className="font-mono text-sm font-bold" style={{ color }}>{entry.xp.toLocaleString()} XP</div>
                    <div className="font-mono text-[9px] px-2 py-0.5 rounded mt-2 inline-block"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                      {entry.rank}
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-3">
                      <MiniStat label="Signals" value={entry.signalsLogged} />
                      <MiniStat label="Tips" value={entry.tipsSent} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full table */}
            <div className="rounded-xl border overflow-hidden mb-6"
              style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.3)' }}>
              <div className="bg-purple-900/20 border-b px-5 py-3" style={{ borderColor: 'rgba(123,46,200,0.2)' }}>
                <div className="font-display text-xs text-purple-300 tracking-widest">ALL OBSERVER RANKINGS</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(123,46,200,0.15)' }}>
                      {['#', 'WALLET', 'RANK', 'XP', 'SIGNALS', 'TIPS', 'ANOMALIES'].map(h => (
                        <th key={h} className="font-mono text-[9px] text-purple-400/50 px-4 py-2 text-left tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {board.map((entry, i) => {
                      const color = getRankColor(entry.rank);
                      const isMe = entry.walletAddress === walletAddress;
                      return (
                        <tr key={entry.walletAddress + i}
                          className="border-b transition-colors hover:bg-purple-900/15"
                          style={{ borderColor: 'rgba(123,46,200,0.08)', background: isMe ? 'rgba(245,158,11,0.05)' : undefined }}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm" style={{ color: i < 3 ? '#fbbf24' : '#6b4db8' }}>
                              {i < 3 ? RANK_ICONS[i] : `#${entry.rank_num}`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                                style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                                {i < 3 ? RANK_ICONS[i] : '◈'}
                              </div>
                              <span className="font-mono text-xs" style={{ color: isMe ? '#fbbf24' : 'rgba(200,180,240,0.8)' }}>
                                {entry.walletAddress}
                                {isMe && <span className="ml-1.5 text-yellow-500 text-[9px] font-ui">(YOU)</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
                              {entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-yellow-400">{entry.xp.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-xs text-cyan-400">{entry.signalsLogged}</td>
                          <td className="px-4 py-3 font-mono text-xs text-purple-400">{entry.tipsSent}</td>
                          <td className="px-4 py-3 font-mono text-xs text-red-400">{entry.anomaliesDetected}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── REPUTATION BOARD ── */}
        {activeTab === 'reputation' && (
          <>
            {/* Top 3 rep spotlight */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {repBoard.slice(0, 3).map((entry, i) => {
                const color = getLevelColor(entry.level);
                const icon  = getLevelIcon(entry.level);
                return (
                  <div key={entry.address + i}
                    className="rounded-xl border p-4 text-center relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(7,17,51,0.95), rgba(26,10,46,0.95))',
                      borderColor: i === 0 ? `${color}60` : `${color}25`,
                      boxShadow: i === 0 ? `0 0 30px ${color}12` : 'none',
                    }}>
                    {i === 0 && (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}08, transparent 60%)` }} />
                    )}
                    <div className="text-3xl mb-2">{RANK_ICONS[i]}</div>
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="font-mono text-[10px] text-purple-300 truncate mb-1">{entry.displayName}</div>
                    <div className="font-mono text-sm font-bold mb-1" style={{ color }}>{entry.reputationScore.toLocaleString()} REP</div>
                    <div className="font-mono text-[9px] px-2 py-0.5 rounded inline-block"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                      {entry.level}
                    </div>
                    <div className="font-mono text-[10px] text-purple-400/50 mt-2">{entry.accuracy}% accuracy</div>
                    {/* Badge strip */}
                    {entry.badges.length > 0 && (
                      <div className="flex justify-center gap-1 mt-2 flex-wrap">
                        {entry.badges.slice(0, 4).map(bid => (
                          <span key={bid} className="text-sm" title={BADGE_CATALOG[bid]?.label}>
                            {BADGE_CATALOG[bid]?.icon}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Full rep table */}
            <div className="rounded-xl border overflow-hidden mb-6"
              style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.3)' }}>
              <div className="bg-purple-900/20 border-b px-5 py-3" style={{ borderColor: 'rgba(123,46,200,0.2)' }}>
                <div className="font-display text-xs text-purple-300 tracking-widest">SIGNAL REPUTATION RANKINGS</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(123,46,200,0.15)' }}>
                      {['#', 'CONTRIBUTOR', 'LEVEL', 'REP', 'SIGNALS', 'REWARDS', 'ACCURACY', 'BADGES'].map(h => (
                        <th key={h} className="font-mono text-[9px] text-purple-400/50 px-4 py-2 text-left tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repBoard.map((entry, i) => {
                      const color = getLevelColor(entry.level);
                      const icon  = getLevelIcon(entry.level);
                      const isMe  = entry.address === walletAddress;
                      return (
                        <tr key={entry.address + i}
                          className="border-b transition-colors hover:bg-purple-900/15"
                          style={{ borderColor: 'rgba(123,46,200,0.08)', background: isMe ? `${color}05` : undefined }}>
                          <td className="px-4 py-3 font-mono text-sm" style={{ color: i < 3 ? '#fbbf24' : '#6b4db8' }}>
                            {i < 3 ? RANK_ICONS[i] : `#${entry.rank}`}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                                style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                                {icon}
                              </div>
                              <span className="font-mono text-xs" style={{ color: isMe ? '#fbbf24' : 'rgba(200,180,240,0.8)' }}>
                                {entry.displayName}
                                {isMe && <span className="ml-1.5 text-yellow-500 text-[9px]">(YOU)</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
                              {entry.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color }}>{entry.reputationScore.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-xs text-cyan-400">{entry.signalsPosted}</td>
                          <td className="px-4 py-3 font-mono text-xs text-yellow-400">{entry.rewardsReceived} OP</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(123,46,200,0.2)' }}>
                                <div className="h-full rounded-full"
                                  style={{ width: `${entry.accuracy}%`, background: entry.accuracy >= 80 ? '#00e676' : entry.accuracy >= 65 ? '#fbbf24' : '#fb923c' }} />
                              </div>
                              <span className="font-mono text-[10px] text-purple-300/70">{entry.accuracy}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-0.5">
                              {entry.badges.slice(0, 4).map(bid => (
                                <span key={bid} className="text-xs"
                                  title={BADGE_CATALOG[bid]?.label ?? bid}
                                  style={{ opacity: 0.8 }}>
                                  {BADGE_CATALOG[bid]?.icon ?? '?'}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}


        {/* ── PREDICTORS BOARD ── */}
        {activeTab === 'predictors' && (
          <>
            {/* Top 3 spotlight */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {predBoard.slice(0, 3).map((entry, i) => (
                <div key={entry.address + i}
                  className="rounded-xl border p-4 text-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(7,17,51,0.97), rgba(16,6,34,0.97))',
                    borderColor: i === 0 ? 'rgba(0,229,255,0.55)' : 'rgba(0,229,255,0.18)',
                    boxShadow:   i === 0 ? '0 0 30px rgba(0,229,255,0.1)' : 'none',
                  }}>
                  {i === 0 && <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.07), transparent 60%)' }} />}
                  <div className="text-3xl mb-2">{RANK_ICONS[i]}</div>
                  <div className="font-mono text-[10px] text-purple-300/70 truncate mb-1">{entry.address}</div>
                  <div className="font-mono text-2xl font-bold text-cyan-400">{entry.accuracy}%</div>
                  <div className="font-mono text-[9px] text-purple-400/40 mb-2">ACCURACY</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="rounded p-1" style={{ background: 'rgba(0,229,255,0.06)' }}>
                      <div className="font-mono text-[10px] text-cyan-400">{entry.predictions}</div>
                      <div className="font-mono text-[8px] text-purple-400/40">preds</div>
                    </div>
                    <div className="rounded p-1" style={{ background: 'rgba(251,191,36,0.06)' }}>
                      <div className="font-mono text-[10px] text-yellow-400">{entry.totalWon.toFixed(0)} OP</div>
                      <div className="font-mono text-[8px] text-purple-400/40">won</div>
                    </div>
                  </div>
                  {entry.streak > 0 && <div className="mt-2 font-mono text-[9px] text-orange-400/70">🔥 {entry.streak} streak</div>}
                </div>
              ))}
            </div>

            {/* Full predictor table */}
            <div className="rounded-xl border overflow-hidden mb-6"
              style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(0,229,255,0.2)' }}>
              <div className="bg-cyan-900/10 border-b px-5 py-3" style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
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
                    {predBoard.map((entry, i) => {
                      const isMe = entry.isUser || entry.address === walletAddress;
                      return (
                        <tr key={entry.address + i}
                          className="border-b transition-colors hover:bg-cyan-900/10"
                          style={{ borderColor: 'rgba(0,229,255,0.05)', background: isMe ? 'rgba(0,229,255,0.04)' : undefined }}>
                          <td className="px-4 py-3 font-mono text-sm" style={{ color: i < 3 ? '#fbbf24' : 'rgba(100,78,184,0.8)' }}>
                            {i < 3 ? RANK_ICONS[i] : `#${entry.rank}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs" style={{ color: isMe ? '#fbbf24' : 'rgba(200,180,240,0.8)' }}>
                              {entry.address}{isMe && <span className="ml-2 text-yellow-500 text-[9px]">(YOU)</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,229,255,0.12)' }}>
                                <div className="h-full rounded-full" style={{ width: `${entry.accuracy}%`, background: entry.accuracy >= 80 ? '#00e676' : entry.accuracy >= 65 ? '#fbbf24' : '#fb923c' }} />
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

            <div className="rounded-xl border p-4"
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
          </>
        )}

        {/* Rank progression */}
        <div className="mt-2 rounded-xl border p-5"
          style={{ background: 'rgba(7,17,51,0.95)', borderColor: 'rgba(123,46,200,0.2)' }}>
          <div className="font-display text-xs text-purple-300 tracking-widest mb-4">REPUTATION LEVELS</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Explorer', 'Operator', 'Guardian', 'Oracle'] as const).map((level) => {
              const color = getLevelColor(level);
              const icon  = getLevelIcon(level);
              const thresholds: Record<string, number> = { Explorer: 0, Operator: 300, Guardian: 900, Oracle: 2500 };
              return (
                <div key={level} className="rounded-lg p-3 border text-center"
                  style={{ borderColor: `${color}25`, background: `${color}08` }}>
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="font-display text-xs font-bold mb-1" style={{ color }}>{level}</div>
                  <div className="font-mono text-[10px] text-purple-400/60">{thresholds[level].toLocaleString()} REP</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 py-2 rounded-lg font-display text-xs tracking-widest transition-all"
      style={{
        background: active ? 'rgba(251,191,36,0.12)' : 'transparent',
        border: active ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
        color: active ? '#fbbf24' : 'rgba(150,130,190,0.5)',
      }}>
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded p-1.5" style={{ background: 'rgba(123,46,200,0.1)' }}>
      <div className="font-mono text-[11px] text-purple-200">{value}</div>
      <div className="font-mono text-[9px] text-purple-400/60">{label}</div>
    </div>
  );
}


  return (
    <div className="min-h-screen bg-[#020818]">
      <HUD />

      {/* Grid background */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.2 }}>
        <div style={{
          backgroundImage: 'linear-gradient(rgba(123,46,200,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(123,46,200,0.2) 1px, transparent 1px)',
          backgroundSize: '50px 50px', width: '100%', height: '100%',
        }} />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/observatory" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Observatory</Link>
          <div>
            <div className="font-display text-2xl text-yellow-400 tracking-widest">🏆 OBSERVER LEADERBOARD</div>
            <div className="font-mono text-[10px] text-purple-400/50 tracking-wider">Signal Intelligence Rankings · Season I</div>
          </div>
        </div>

        {/* Top 3 spotlight */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {board.slice(0, 3).map((entry, i) => {
            const color = getRankColor(entry.rank);
            return (
              <div key={entry.walletAddress + i}
                className="rounded-xl border p-4 text-center relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(7,17,51,0.95), rgba(26,10,46,0.95))',
                  borderColor: i === 0 ? 'rgba(245,158,11,0.5)' : `${color}30`,
                  boxShadow: i === 0 ? '0 0 30px rgba(245,158,11,0.12)' : 'none',
                  order: i === 1 ? -1 : 0, // 2nd place center on mobile
                }}>
                {/* Position glow */}
                {i === 0 && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08), transparent 60%)' }} />
                )}
                <div className="text-3xl mb-2">{RANK_ICONS[i]}</div>
                <div className="font-display text-xs font-bold mb-1" style={{ color }}>#{entry.rank_num}</div>
                <div className="font-mono text-[10px] text-purple-300 truncate mb-1">{entry.walletAddress}</div>
                <div className="font-mono text-sm font-bold" style={{ color }}>
                  {entry.xp.toLocaleString()} XP
                </div>
                <div className="font-mono text-[9px] px-2 py-0.5 rounded mt-2 inline-block"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                  {entry.rank}
                </div>
                <div className="grid grid-cols-2 gap-1 mt-3">
                  <MiniStat label="Signals" value={entry.signalsLogged} />
                  <MiniStat label="Tips" value={entry.tipsSent} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Full table */}
        <div className="rounded-xl border overflow-hidden"
          style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.3)' }}>
          <div className="bg-purple-900/20 border-b px-5 py-3 flex items-center"
            style={{ borderColor: 'rgba(123,46,200,0.2)' }}>
            <div className="font-display text-xs text-purple-300 tracking-widest">ALL RANKINGS</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(123,46,200,0.15)' }}>
                  {['#', 'WALLET', 'RANK', 'XP', 'SIGNALS', 'TIPS', 'ANOMALIES'].map(h => (
                    <th key={h} className="font-mono text-[9px] text-purple-400/50 px-4 py-2 text-left tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.map((entry, i) => {
                  const color = getRankColor(entry.rank);
                  const isMe = entry.walletAddress === walletAddress;

                  return (
                    <tr key={entry.walletAddress + i}
                      className="border-b transition-colors hover:bg-purple-900/15"
                      style={{
                        borderColor: 'rgba(123,46,200,0.08)',
                        background: isMe ? 'rgba(245,158,11,0.05)' : undefined,
                      }}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm" style={{ color: i < 3 ? '#fbbf24' : '#6b4db8' }}>
                          {i < 3 ? RANK_ICONS[i] : `#${entry.rank_num}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                            {i < 3 ? RANK_ICONS[i] : '◈'}
                          </div>
                          <span className="font-mono text-xs" style={{ color: isMe ? '#fbbf24' : 'rgba(200,180,240,0.8)' }}>
                            {entry.walletAddress}
                            {isMe && <span className="ml-1.5 text-yellow-500 text-[9px] font-ui">(YOU)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-yellow-400">
                        {entry.xp.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cyan-400">{entry.signalsLogged}</td>
                      <td className="px-4 py-3 font-mono text-xs text-purple-400">{entry.tipsSent}</td>
                      <td className="px-4 py-3 font-mono text-xs text-red-400">{entry.anomaliesDetected}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rank progression */}
        <div className="mt-6 rounded-xl border p-5"
          style={{ background: 'rgba(7,17,51,0.95)', borderColor: 'rgba(123,46,200,0.2)' }}>
          <div className="font-display text-xs text-purple-300 tracking-widest mb-4">RANK PROGRESSION</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Explorer', 'Analyst', 'Signal Hunter', 'Nexus Guardian'] as const).map((rank, i) => {
              const color = getRankColor(rank);
              const thresholds = [0, 200, 600, 1500];
              return (
                <div key={rank} className="rounded-lg p-3 border text-center"
                  style={{ borderColor: `${color}25`, background: `${color}08` }}>
                  <div className="text-xl mb-1">{['🔍', '📊', '🎯', '🛰'][i]}</div>
                  <div className="font-display text-xs font-bold mb-1" style={{ color }}>{rank}</div>
                  <div className="font-mono text-[10px] text-purple-400/60">{thresholds[i].toLocaleString()} XP</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded p-1.5" style={{ background: 'rgba(123,46,200,0.1)' }}>
      <div className="font-mono text-[11px] text-purple-200">{value}</div>
      <div className="font-mono text-[9px] text-purple-400/60">{label}</div>
    </div>
  );
}
