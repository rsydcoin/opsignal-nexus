'use client';

import { xpProgress, getLevelTitle } from '@/lib/xpSystem';

interface XPBarProps {
  xp: number;
  compact?: boolean;
}

export default function XPBar({ xp, compact = false }: XPBarProps) {
  const { current, needed, level, percentage } = xpProgress(xp);
  const title = getLevelTitle(level);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-ui text-xs text-purple-300">LVL {level}</span>
        <div className="flex-1 h-1.5 rounded-full bg-purple-900/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-yellow-400">{current}/{needed}</span>
      </div>
    );
  }

  return (
    <div className="arcane-card rounded-xl p-4 border border-yellow-500/20">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-yellow-400 text-sm tracking-wider">{title}</div>
          <div className="font-ui text-purple-300 text-xs">Level {level}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-yellow-400 text-sm">{xp.toLocaleString()} XP</div>
          <div className="font-mono text-purple-300 text-xs">{current} / {needed}</div>
        </div>
      </div>

      <div className="relative h-3 rounded-full bg-purple-900/60 overflow-hidden border border-purple-500/20">
        {/* Background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        {/* Fill */}
        <div
          className="relative h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a)',
            boxShadow: '0 0 10px rgba(245,158,11,0.6)',
          }}
        >
          {/* Sparkle on tip */}
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-r from-transparent to-white/30 rounded-r-full" />
        </div>
      </div>

      <div className="mt-2 text-right font-mono text-[10px] text-yellow-400/60">
        {(100 - percentage).toFixed(1)}% to next level
      </div>
    </div>
  );
}
