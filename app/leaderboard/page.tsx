'use client';

import { useMemo } from 'react';
import HUD from '@/components/HUD';
import { useWallet } from '@/lib/walletContext';
import { loadObserverStats, getObserverLeaderboard, getRankColor } from '@/lib/opnetSignals';
import Link from 'next/link';

const RANK_ICONS = ['👑', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { walletAddress, isConnected } = useWallet();

  const myStats = useMemo(() => {
    if (!walletAddress) return undefined;
    return loadObserverStats(walletAddress);
  }, [walletAddress]);

  const board = useMemo(() => getObserverLeaderboard(myStats), [myStats]);

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
