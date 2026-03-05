'use client';

import { useMemo } from 'react';
import HUD from '@/components/HUD';
import Leaderboard from '@/components/Leaderboard';
import XPBar from '@/components/XPBar';
import { useWallet } from '@/lib/walletContext';
import { getLeaderboard, LeaderboardEntry } from '@/lib/leaderboard';
import { getLevelTitle } from '@/lib/xpSystem';
import Link from 'next/link';

export default function GuildPage() {
  const { player, walletAddress, isConnected } = useWallet();

  const playerEntry: LeaderboardEntry | undefined = isConnected ? {
    rank: 0,
    wallet: walletAddress || '0xYou...r',
    level: player.level,
    xp: player.xp,
    winrate: player.winrate,
    wins: player.wins,
  } : undefined;

  const leaderboard = useMemo(() => getLeaderboard(playerEntry), [player.xp]);
  const title = getLevelTitle(player.level);

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div className="font-display text-2xl text-purple-400 tracking-widest">🏰 GUILD HALL</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <Leaderboard entries={leaderboard} currentWallet={walletAddress || undefined} />
          </div>

          {/* Player Profile */}
          <div className="space-y-4">
            {isConnected ? (
              <>
                <div className="arcane-card rounded-xl p-6 border border-purple-500/30 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-purple-600 flex items-center justify-center text-3xl mx-auto mb-4"
                    style={{ boxShadow: '0 0 30px rgba(245,158,11,0.4)' }}>
                    ⚔
                  </div>
                  <div className="font-display text-yellow-400 text-lg tracking-wider mb-1">{title}</div>
                  <div className="font-mono text-purple-300 text-xs mb-4">{walletAddress}</div>
                  <XPBar xp={player.xp} />
                </div>

                <div className="arcane-card rounded-xl p-4 border border-purple-500/20">
                  <div className="font-display text-purple-300 text-xs tracking-widest mb-3">COMBAT RECORD</div>
                  <div className="space-y-2">
                    <StatRow label="Wins" value={player.wins.toString()} color="#00e676" />
                    <StatRow label="Losses" value={player.losses.toString()} color="#ff6b6b" />
                    <StatRow label="Win Rate" value={`${player.winrate.toFixed(1)}%`} color="#fbbf24" />
                    <StatRow label="Multiplier" value={`${player.multiplier.toFixed(2)}x`} color="#00e5ff" />
                    <StatRow label="Total XP" value={player.xp.toLocaleString()} color="#c087f5" />
                  </div>
                </div>

                {/* Artifacts */}
                {player.artifacts.length > 0 && (
                  <div className="arcane-card rounded-xl p-4 border border-yellow-500/20">
                    <div className="font-display text-yellow-400 text-xs tracking-widest mb-3">ARTIFACTS</div>
                    <div className="space-y-1.5">
                      {player.artifacts.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-yellow-400">◈</span>
                          <span className="font-body italic text-purple-200 text-xs">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="arcane-card rounded-xl p-8 border border-purple-500/20 text-center">
                <div className="text-4xl mb-4">🏰</div>
                <div className="font-body italic text-purple-300/60 text-sm">
                  Connect wallet to view your guild rank
                </div>
              </div>
            )}

            {/* Guild Info */}
            <div className="arcane-card rounded-xl p-4 border border-yellow-500/15">
              <div className="font-display text-yellow-400/50 text-xs tracking-widest mb-2">GUILD: SIGNAL KNIGHTS</div>
              <div className="font-mono text-purple-400/60 text-[10px] space-y-1">
                <div>Season I • Active</div>
                <div>Members: {leaderboard.length + 1}</div>
                <div>Top Tier: 👑 Arcane Order</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-purple-500/10">
      <span className="font-ui text-xs text-purple-400">{label}</span>
      <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
