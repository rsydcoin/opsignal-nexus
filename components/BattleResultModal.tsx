'use client';

import { useEffect, useState } from 'react';
import { BattleResult } from '@/lib/gameEngine';

interface BattleResultModalProps {
  result: BattleResult | null;
  onClose: () => void;
  leveledUp?: boolean;
}

export default function BattleResultModal({ result, onClose, leveledUp }: BattleResultModalProps) {
  const [phase, setPhase] = useState<'processing' | 'reveal' | 'done'>('processing');

  useEffect(() => {
    if (!result) return;
    setPhase('processing');
    const t1 = setTimeout(() => setPhase('reveal'), 1500);
    const t2 = setTimeout(() => setPhase('done'), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [result]);

  if (!result) return null;

  const isWin = result.outcome === 'WIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={phase === 'done' ? onClose : undefined}>
      <div
        className="relative max-w-md w-full mx-4 rounded-2xl overflow-hidden border"
        style={{
          borderColor: isWin ? 'rgba(245,158,11,0.5)' : 'rgba(255,23,68,0.5)',
          boxShadow: isWin
            ? '0 0 60px rgba(245,158,11,0.4), 0 0 120px rgba(245,158,11,0.15)'
            : '0 0 60px rgba(255,23,68,0.4), 0 0 120px rgba(255,23,68,0.15)',
          background: 'linear-gradient(135deg, rgba(4,13,36,0.98), rgba(26,10,46,0.98))',
        }}
      >
        {/* Processing phase */}
        {phase === 'processing' && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-6 animate-bounce">⚔</div>
            <div className="font-display text-yellow-400 text-xl tracking-widest glow-gold processing-blink">
              BATTLE PROCESSING
            </div>
            <div className="mt-4 flex justify-center gap-1">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-yellow-500"
                  style={{ animation: `bounce 0.6s ${i * 0.1}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Reveal phase */}
        {(phase === 'reveal' || phase === 'done') && (
          <div className="p-8">
            {/* Result header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">{isWin ? '🏆' : '💀'}</div>
              <div
                className="font-display text-4xl font-black tracking-widest"
                style={{
                  color: isWin ? '#fbbf24' : '#ff1744',
                  textShadow: isWin
                    ? '0 0 20px rgba(245,158,11,0.8)'
                    : '0 0 20px rgba(255,23,68,0.8)',
                  animation: 'levelUpBurst 0.5s ease-out'
                }}
              >
                {result.outcome}
              </div>
            </div>

            {/* Divider */}
            <div className="rune-divider mb-6" />

            {/* Message */}
            <div className="font-body italic text-purple-200 text-center mb-6 text-sm leading-relaxed">
              "{result.message}"
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatBox label="XP GAINED" value={`+${result.xpReward}`} color="#fbbf24" />
              <StatBox label="WIN PROBABILITY" value={`${(result.winProbability * 100).toFixed(1)}%`} color="#c087f5" />
              <StatBox label="RISK SCORE" value={`${(result.riskScore * 100).toFixed(1)}%`} color={isWin ? '#00e676' : '#ff6b6b'} />
              {isWin && <StatBox label="MULTIPLIER BONUS" value={`+${result.multiplierBonus.toFixed(2)}x`} color="#00e5ff" />}
            </div>

            {/* Level up banner */}
            {leveledUp && (
              <div className="rounded-lg bg-yellow-500/20 border border-yellow-400/40 p-3 text-center mb-4"
                style={{ animation: 'portalPulse 1.5s ease-in-out infinite' }}>
                <div className="font-display text-yellow-400 text-sm tracking-widest">⚡ LEVEL UP! ⚡</div>
                <div className="font-body text-yellow-300/70 text-xs italic">Your power grows, Signal Knight</div>
              </div>
            )}

            {phase === 'done' && (
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg font-display text-sm tracking-widest transition-all"
                style={{
                  background: isWin ? 'rgba(245,158,11,0.15)' : 'rgba(123,46,200,0.15)',
                  border: `1px solid ${isWin ? 'rgba(245,158,11,0.4)' : 'rgba(123,46,200,0.4)'}`,
                  color: isWin ? '#fbbf24' : '#c087f5',
                }}
              >
                CONTINUE →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-purple-900/30 border border-purple-500/20 p-3 text-center">
      <div className="font-mono text-[10px] text-purple-400 tracking-wider mb-1">{label}</div>
      <div className="font-display text-base font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
