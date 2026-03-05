'use client';

import { useState, useEffect } from 'react';
import HUD from '@/components/HUD';
import AICompanion from '@/components/AICompanion';
import { useWallet } from '@/lib/walletContext';
import { generateArenaSignals, resolveArenaChallenge, ArenaSignal } from '@/lib/arenaEngine';
import { addXP } from '@/lib/xpSystem';
import Link from 'next/link';

export default function ArenaPage() {
  const { player, updatePlayer, walletAddress, isConnected } = useWallet();
  const [signals, setSignals] = useState<ArenaSignal[]>([]);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ msg: string; xp: number; win: boolean } | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  useEffect(() => {
    setSignals(generateArenaSignals());
  }, []);

  const handleChallenge = async (signal: ArenaSignal) => {
    if (!isConnected || !walletAddress) return;
    setChallenging(signal.id);

    await new Promise(r => setTimeout(r, 1500));

    const result = resolveArenaChallenge(signal, walletAddress);
    const isWin = result.winner === walletAddress;

    setLastResult({
      msg: result.outcome,
      xp: result.xpGained,
      win: isWin,
    });

    setAiInsights([
      isWin ? `🏆 Challenge successful! You claimed ${result.xpGained} XP from the arena.` : `💀 Challenge failed. The original signal held true.`,
      `📊 Signal confidence was ${signal.confidence}% — ${signal.confidence > 60 ? 'strong signal, risky challenge' : 'weak signal, favorable odds'}.`,
    ]);

    if (isWin) {
      const { newPlayer } = addXP({
        ...player,
        wins: player.wins + 1,
      }, result.xpGained);
      updatePlayer(newPlayer);
    } else {
      const updatedPlayer = { ...player, losses: player.losses + 1 };
      updatePlayer(updatedPlayer);
    }

    // Update signal status
    setSignals(prev => prev.map(s => s.id === signal.id ? { ...s, status: 'RESOLVED', result: isWin ? 'LOSE' : 'WIN' } : s));
    setChallenging(null);
  };

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div className="font-display text-2xl text-red-400 tracking-widest">🗡 SIGNAL ARENA</div>
        </div>

        {lastResult && (
          <div
            className="rounded-xl p-4 border mb-6 flex items-center justify-between"
            style={{
              background: lastResult.win ? 'rgba(0,230,118,0.08)' : 'rgba(255,23,68,0.08)',
              borderColor: lastResult.win ? 'rgba(0,230,118,0.3)' : 'rgba(255,23,68,0.3)',
            }}
          >
            <div>
              <div className="font-display text-sm tracking-wider" style={{ color: lastResult.win ? '#00e676' : '#ff1744' }}>
                {lastResult.win ? '⚔ VICTORY' : '💀 DEFEAT'}
              </div>
              <div className="font-body italic text-purple-200/70 text-xs mt-1">{lastResult.msg}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-yellow-400 text-sm">+{lastResult.xp} XP</div>
              <button onClick={() => setLastResult(null)} className="font-mono text-[10px] text-purple-400 mt-1 hover:text-yellow-400 transition-colors">dismiss</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Signal Board */}
          <div className="lg:col-span-2">
            <div className="arcane-card rounded-xl overflow-hidden border border-red-500/25">
              <div className="bg-gradient-to-r from-red-900/40 to-purple-900/40 px-5 py-3 border-b border-red-500/20">
                <div className="font-display text-red-400 text-sm tracking-widest">LIVE SIGNAL BOARD</div>
                <div className="font-ui text-purple-300/60 text-xs">Challenge active signals to win XP</div>
              </div>

              <div className="divide-y divide-purple-500/10">
                {signals.map(signal => {
                  const isChallenging = challenging === signal.id;
                  const isResolved = signal.status === 'RESOLVED';

                  return (
                    <div key={signal.id}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-purple-900/10 transition-colors"
                      style={{ opacity: isResolved ? 0.5 : 1 }}>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-yellow-300 font-bold">{signal.token}</span>
                          <span className="font-mono text-xs text-purple-400">→ {signal.targetMultiplier}x</span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            signal.status === 'OPEN' ? 'text-emerald-400 bg-emerald-500/10' :
                            signal.status === 'CHALLENGED' ? 'text-yellow-400 bg-yellow-500/10' :
                            'text-purple-400 bg-purple-500/10'
                          }`}>
                            {signal.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-purple-400">{signal.challenger}</span>
                          <span className="font-mono text-[10px] text-purple-500">·</span>
                          <span className="font-mono text-[10px] text-cyan-400">Conf: {signal.confidence}%</span>
                          <span className="font-mono text-[10px] text-purple-500">·</span>
                          <span className="font-mono text-[10px] text-yellow-400">Pool: {signal.xpPool} XP</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-mono text-xs text-yellow-400">${signal.stake}</div>
                        </div>

                        {!isResolved && signal.status === 'OPEN' && (
                          <button
                            onClick={() => handleChallenge(signal)}
                            disabled={!isConnected || !!challenging}
                            className="px-3 py-1.5 rounded-lg font-display text-xs tracking-wider transition-all disabled:opacity-40"
                            style={{
                              background: 'rgba(255,23,68,0.1)',
                              border: '1px solid rgba(255,23,68,0.4)',
                              color: '#ff6b6b',
                            }}
                          >
                            {isChallenging ? '⚡...' : '⚔ CHALLENGE'}
                          </button>
                        )}
                        {isResolved && (
                          <span className="font-mono text-xs" style={{
                            color: signal.result === 'WIN' ? '#00e676' : '#ff1744'
                          }}>
                            {signal.result}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="arcane-card rounded-xl p-4 border border-red-500/20">
              <div className="font-display text-red-400 text-xs tracking-widest mb-3">ARENA RULES</div>
              <div className="space-y-2 font-body italic text-purple-300/70 text-xs">
                <p>• Challenge any OPEN signal to contest the prediction.</p>
                <p>• If the original signal fails, challenger claims the XP pool.</p>
                <p>• Higher confidence = harder to challenge but bigger pool.</p>
                <p>• Win rate affects future battle probabilities.</p>
              </div>
            </div>

            <AICompanion insights={aiInsights} isAnalyzing={!!challenging} />

            <button
              onClick={() => setSignals(generateArenaSignals())}
              className="w-full py-2.5 rounded-xl font-display text-xs tracking-widest transition-all"
              style={{
                background: 'rgba(123,46,200,0.1)',
                border: '1px solid rgba(123,46,200,0.3)',
                color: '#c087f5',
              }}
            >
              🔄 REFRESH ARENA
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
