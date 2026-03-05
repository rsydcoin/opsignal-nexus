'use client';

import { LeaderboardEntry } from '@/lib/leaderboard';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentWallet?: string;
}

const BADGE_CONFIG = {
  gold: { icon: '👑', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
  silver: { icon: '🛡', color: '#e2e8f0', bg: 'rgba(226,232,240,0.1)', border: 'rgba(226,232,240,0.3)' },
  bronze: { icon: '⚔', color: '#d97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.3)' },
};

export default function Leaderboard({ entries, currentWallet }: LeaderboardProps) {
  return (
    <div className="arcane-card rounded-xl overflow-hidden border border-purple-500/30">
      <div className="bg-gradient-to-r from-purple-900/60 to-navy-800/60 px-4 py-3 border-b border-purple-500/20">
        <div className="font-display text-yellow-400 text-sm tracking-widest">GUILD RANKINGS</div>
        <div className="font-ui text-purple-300/60 text-xs">Season I — Signal Knights</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-500/20">
              <th className="font-mono text-[10px] text-purple-400 px-4 py-2 text-left tracking-wider">#</th>
              <th className="font-mono text-[10px] text-purple-400 px-4 py-2 text-left tracking-wider">WALLET</th>
              <th className="font-mono text-[10px] text-purple-400 px-3 py-2 text-center tracking-wider">LVL</th>
              <th className="font-mono text-[10px] text-purple-400 px-3 py-2 text-right tracking-wider">XP</th>
              <th className="font-mono text-[10px] text-purple-400 px-3 py-2 text-right tracking-wider">WIN%</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const isCurrentPlayer = entry.wallet === currentWallet;
              const badge = entry.badge ? BADGE_CONFIG[entry.badge] : null;

              return (
                <tr
                  key={entry.wallet + i}
                  className="border-b border-purple-500/10 transition-colors hover:bg-purple-900/20"
                  style={isCurrentPlayer ? { background: 'rgba(245,158,11,0.08)' } : undefined}
                >
                  <td className="px-4 py-2.5">
                    {badge ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{badge.icon}</span>
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: badge.color }}
                        >
                          {entry.rank}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-purple-400">{entry.rank}</span>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={{
                          background: badge ? badge.bg : 'rgba(123,46,200,0.15)',
                          border: `1px solid ${badge ? badge.border : 'rgba(123,46,200,0.3)'}`,
                        }}
                      >
                        {badge ? badge.icon : '⚔'}
                      </div>
                      <span
                        className="font-mono text-xs"
                        style={{ color: isCurrentPlayer ? '#fbbf24' : '#c4b5e0' }}
                      >
                        {entry.wallet}
                        {isCurrentPlayer && (
                          <span className="ml-1 text-[9px] text-yellow-500 font-ui">(YOU)</span>
                        )}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="font-mono text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(123,46,200,0.2)',
                        color: '#c087f5',
                      }}
                    >
                      {entry.level}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono text-xs text-yellow-400">{entry.xp.toLocaleString()}</span>
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="font-mono text-xs"
                      style={{ color: entry.winrate >= 60 ? '#00e676' : entry.winrate >= 45 ? '#fbbf24' : '#ff6b6b' }}
                    >
                      {entry.winrate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
