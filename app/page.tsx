'use client';

import { useWallet } from '@/lib/walletContext';
import HUD from '@/components/HUD';
import PortalButton from '@/components/PortalButton';
import XPBar from '@/components/XPBar';
import { getLevelTitle } from '@/lib/xpSystem';
import MarketTicker from '@/components/MarketTicker';

const PORTALS = [
  { href: '/observatory',  icon: '🛰', label: 'Observatory',   subtitle: 'AI signal intelligence', color: 'cyan' as const },
  { href: '/timemachine', icon: '⏳', label: 'Time Machine',   subtitle: 'Explore signal history',  color: 'purple' as const },
  { href: '/timeline',    icon: '📋', label: 'Signal Timeline', subtitle: 'Chronological feed',     color: 'cyan' as const },
  { href: '/profile',     icon: '👤', label: 'My Profile',     subtitle: 'Reputation & badges',    color: 'gold' as const },
  { href: '/predictions', icon: '📊', label: 'Pred. Market',   subtitle: 'Stake OP on signals',     color: 'cyan' as const },
  { href: '/battle', icon: '⚔', label: 'Signal Battle', subtitle: 'Test your predictions', color: 'gold' as const },
  { href: '/radar', icon: '📡', label: 'Risk Radar', subtitle: 'Scan vault dangers', color: 'cyan' as const },
  { href: '/forge', icon: '🔥', label: 'Yield Forge', subtitle: 'Stake & earn XP', color: 'red' as const },
  { href: '/quests', icon: '📜', label: 'Quest Log', subtitle: 'Daily missions', color: 'gold' as const },
  { href: '/guild', icon: '🏰', label: 'Guild Hall', subtitle: 'Leaderboards', color: 'purple' as const },
  { href: '/arena', icon: '🗡', label: 'Signal Arena', subtitle: 'PvP challenges', color: 'red' as const },
  { href: '/dungeon', icon: '💀', label: 'Vault Dungeon', subtitle: 'Dungeon raids', color: 'purple' as const },
  { href: '/leaderboard', icon: '🏆', label: 'Observer Board', subtitle: 'Signal rankings', color: 'gold' as const },
];

export default function HomePage() {
  const { isConnected, player, connectWallet, isConnecting } = useWallet();
  const title = getLevelTitle(player.level);

  return (
    <div className="min-h-screen">
      <HUD />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 relative">
          {/* Decorative rune circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-96 h-96 rounded-full opacity-10"
              style={{
                border: '1px solid #f59e0b',
                boxShadow: '0 0 60px rgba(245,158,11,0.3)',
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-72 h-72 rounded-full opacity-15 animate-spin"
              style={{
                border: '1px dashed rgba(123,46,200,0.6)',
                animationDuration: '30s',
              }}
            />
          </div>

          <div className="relative z-10 pt-4">
            <div className="font-mono text-purple-400/60 text-xs tracking-[0.4em] mb-3 uppercase">
              ◈ Signal Knights Protocol ◈
            </div>

            <h1
              className="font-display text-5xl sm:text-7xl font-black tracking-widest mb-2"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #fcd34d, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(245,158,11,0.5))',
              }}
            >
              OPSIGNAL
            </h1>
            <h1
              className="font-display text-5xl sm:text-7xl font-black tracking-widest mb-4"
              style={{
                background: 'linear-gradient(135deg, #c087f5, #9b4de8, #c087f5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(123,46,200,0.5))',
              }}
            >
              NEXUS
            </h1>

            <div className="rune-divider max-w-xs mx-auto mb-4" />

            <p className="font-body italic text-purple-200/80 text-lg sm:text-xl tracking-wide">
              Forge signals. Scan risk. Conquer yield.
            </p>
          </div>
        </div>

        {/* Player Stats (if connected) */}
        {isConnected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            <StatCard label="Level" value={player.level.toString()} icon="⚡" color="#fbbf24" />
            <StatCard label="Total XP" value={player.xp.toLocaleString()} icon="✨" color="#c087f5" />
            <StatCard label="Win Rate" value={`${player.winrate.toFixed(1)}%`} icon="🏆" color="#00e676" />
            <StatCard label="Multiplier" value={`${player.multiplier.toFixed(1)}x`} icon="🔥" color="#00e5ff" />
          </div>
        )}

        {/* XP Bar */}
        {isConnected && (
          <div className="mb-10">
            <XPBar xp={player.xp} />
          </div>
        )}

        {/* Live Market Prices */}
        <div className="mb-8 px-1">
          <MarketTicker compact />
        </div>

        {/* Portal Grid */}
        {isConnected ? (
          <>
            <div className="text-center mb-6">
              <span className="font-mono text-xs text-purple-400/60 tracking-[0.3em] uppercase">
                ◈ Choose Your Destiny ◈
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {PORTALS.map(portal => (
                <PortalButton key={portal.href} {...portal} />
              ))}
              {/* Featured: larger card */}
            </div>
          </>
        ) : (
          /* Connect CTA */
          <div className="text-center py-16">
            <div
              className="inline-block p-12 rounded-2xl mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(7,17,51,0.9), rgba(26,10,46,0.9))',
                border: '1px solid rgba(245,158,11,0.3)',
                boxShadow: '0 0 40px rgba(245,158,11,0.1)',
              }}
            >
              <div className="text-6xl mb-6 animate-float">⚔</div>
              <div className="font-display text-yellow-400 text-2xl tracking-widest mb-3">BEGIN YOUR JOURNEY</div>
              <div className="font-body italic text-purple-200/70 mb-8 max-w-sm">
                Connect your wallet to become a Signal Knight and enter the Nexus.
              </div>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="portal-btn px-10 py-4 rounded-xl font-display text-base tracking-widest text-yellow-400 border border-yellow-500/40 transition-all hover:scale-105 disabled:opacity-60"
                style={{
                  boxShadow: '0 0 30px rgba(245,158,11,0.2)',
                }}
              >
                {isConnecting ? '⚡ CONNECTING...' : '⚡ CONNECT WALLET'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-50 pointer-events-none">
              {PORTALS.slice(0, 4).map(portal => (
                <PortalButton key={portal.href} {...portal} />
              ))}
            </div>
          </div>
        )}

        {/* Lore Footer */}
        <div className="mt-16 text-center">
          <div className="rune-divider max-w-md mx-auto mb-4" />
          <p className="font-body italic text-purple-400/40 text-sm">
            "In the age of DeFi, only those who read the signals shall inherit the yield."
          </p>
          <div className="font-mono text-purple-500/30 text-[10px] mt-2 tracking-widest">
            — The Arcane Protocol, Chapter I
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div
      className="rounded-xl p-4 text-center border border-purple-500/20"
      style={{ background: 'linear-gradient(135deg, rgba(7,17,51,0.8), rgba(26,10,46,0.8))' }}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-display text-lg font-bold" style={{ color }}>{value}</div>
      <div className="font-ui text-xs text-purple-400 tracking-wider">{label}</div>
    </div>
  );
}
