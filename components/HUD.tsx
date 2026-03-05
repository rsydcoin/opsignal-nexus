'use client';

import Link from 'next/link';
import { useWallet } from '@/lib/walletContext';
import { xpProgress, getLevelTitle } from '@/lib/xpSystem';
import { Shield, Zap, TrendingUp, Home } from 'lucide-react';

export default function HUD() {
  const { walletAddress, isConnected, player, connectWallet, disconnectWallet } = useWallet();
  const progress = xpProgress(player.xp);
  const title = getLevelTitle(player.level);

  return (
    <header className="sticky top-0 z-50 border-b border-yellow-500/20 bg-[#020818]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">

        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500/20 to-purple-800/20 border border-yellow-500/30 flex items-center justify-center group-hover:border-yellow-500/60 transition-all">
            <span className="text-yellow-400 text-lg">⚔</span>
          </div>
          <div className="hidden sm:block">
            <div className="font-display text-yellow-400 text-sm font-bold tracking-widest leading-tight glow-gold">NEXUS</div>
            <div className="font-ui text-purple-300 text-[10px] tracking-wider opacity-70">OPSIGNAL</div>
          </div>
        </Link>

        {/* Center: Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: '/observatory', label: 'Observatory', icon: '🛰', highlight: true },
            { href: '/battle', label: 'Battle', icon: '⚔' },
            { href: '/radar', label: 'Radar', icon: '📡' },
            { href: '/forge', label: 'Forge', icon: '🔥' },
            { href: '/quests', label: 'Quests', icon: '📜' },
            { href: '/guild', label: 'Guild', icon: '🏰' },
            { href: '/arena', label: 'Arena', icon: '🗡' },
            { href: '/dungeon', label: 'Dungeon', icon: '💀' },
            { href: '/leaderboard', label: 'Board', icon: '🏆' },
          ].map(nav => (
            <Link key={nav.href} href={nav.href}
              className="px-3 py-1 rounded font-ui text-xs font-500 transition-all border"
              style={{
                color: (nav as { highlight?: boolean }).highlight ? '#00e5ff' : undefined,
                borderColor: (nav as { highlight?: boolean }).highlight ? 'rgba(0,229,255,0.2)' : 'transparent',
                background: (nav as { highlight?: boolean }).highlight ? 'rgba(0,229,255,0.05)' : undefined,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#fbbf24';
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(245,158,11,0.07)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = (nav as { highlight?: boolean }).highlight ? '#00e5ff' : '';
                (e.currentTarget as HTMLAnchorElement).style.background = (nav as { highlight?: boolean }).highlight ? 'rgba(0,229,255,0.05)' : '';
              }}>
              <span className="mr-1">{nav.icon}</span>{nav.label}
            </Link>
          ))}
        </nav>

        {/* Right: Player HUD */}
        {isConnected ? (
          <div className="flex items-center gap-3">
            {/* Stats row */}
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp size={12} />
                <span>{player.winrate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Zap size={12} />
                <span>{player.multiplier.toFixed(1)}x</span>
              </div>
            </div>

            {/* Player card */}
            <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 rounded-lg px-3 py-1.5">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                <Shield size={14} className="text-white" />
              </div>

              <div className="hidden sm:block">
                <div className="font-ui text-yellow-300 text-xs font-bold leading-tight">{title}</div>
                <div className="font-mono text-purple-300 text-[10px] leading-tight">{walletAddress?.slice(0, 12)}...</div>
              </div>

              <div className="hidden sm:block w-20">
                <div className="flex justify-between mb-0.5">
                  <span className="font-ui text-[10px] text-purple-300">LVL {player.level}</span>
                  <span className="font-mono text-[9px] text-yellow-400">{progress.current}/{progress.needed}</span>
                </div>
                <div className="h-1.5 rounded-full bg-purple-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-1000"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={disconnectWallet}
              className="text-purple-400 hover:text-red-400 transition-colors text-xs font-ui hidden sm:block"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="portal-btn px-4 py-2 rounded-lg font-ui font-bold text-sm text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/10 transition-all"
          >
            ⚡ Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
