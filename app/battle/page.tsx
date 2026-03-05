'use client';

import { useState } from 'react';
import HUD from '@/components/HUD';
import BattleResultModal from '@/components/BattleResultModal';
import AICompanion from '@/components/AICompanion';
import { useWallet } from '@/lib/walletContext';
import { runBattle, BattleInput, BattleResult } from '@/lib/gameEngine';
import { addXP, updateWinRate } from '@/lib/xpSystem';
import Link from 'next/link';

export default function BattlePage() {
  const { player, updatePlayer, signTransaction, isConnected } = useWallet();

  const [form, setForm] = useState<BattleInput>({
    tokenName: '',
    targetMultiplier: 2,
    duration: 30,
    confidence: 65,
    stakeAmount: 100,
  });

  const [result, setResult] = useState<BattleResult | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!isConnected) return;
    if (!form.tokenName.trim()) return;

    setIsProcessing(true);
    await signTransaction(`BATTLE:${JSON.stringify(form)}`);

    const battleResult = runBattle(form);

    // Generate AI insights
    const insights: string[] = [];
    if (form.confidence < 50) insights.push(`⚠ Low confidence signal (${form.confidence}%). Risk of catastrophic loss elevated.`);
    if (form.targetMultiplier > 5) insights.push(`🚀 Extreme target multiplier detected. High reward but thin probability.`);
    if (battleResult.riskScore > 0.6) insights.push(`💀 Rune analysis: Risk threshold exceeded. Defensive stance recommended.`);
    insights.push(`📊 Win probability calculated at ${(battleResult.winProbability * 100).toFixed(1)}% for ${form.tokenName}.`);
    setAiInsights(insights);

    await new Promise(r => setTimeout(r, 500));

    setResult(battleResult);

    const isWin = battleResult.outcome === 'WIN';
    const updatedPlayer = {
      ...player,
      wins: isWin ? player.wins + 1 : player.wins,
      losses: !isWin ? player.losses + 1 : player.losses,
    };
    const winratePlayer = updateWinRate(updatedPlayer);
    const { newPlayer, leveledUp: lu } = addXP(winratePlayer, battleResult.xpReward);
    newPlayer.multiplier = parseFloat((newPlayer.multiplier + battleResult.multiplierBonus).toFixed(2));

    // Quest progress
    if (isWin) {
      newPlayer.questProgress = {
        ...newPlayer.questProgress,
        battlesWon: newPlayer.questProgress.battlesWon + 1,
      };
    }

    setLeveledUp(lu);
    updatePlayer(newPlayer);
    setIsProcessing(false);
  };

  const riskScore = form.tokenName ? runBattle(form).riskScore : 0;

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div className="font-display text-2xl text-yellow-400 tracking-widest glow-gold">⚔ SIGNAL BATTLE</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Battle Form */}
          <div className="lg:col-span-3 arcane-card rounded-xl p-6 border border-yellow-500/25">
            <div className="font-display text-yellow-400 text-sm tracking-widest mb-6 pb-3 border-b border-yellow-500/20">
              FORGE YOUR SIGNAL
            </div>

            <div className="space-y-5">
              <FormField label="TOKEN NAME" hint="e.g. OPETH, OPBTC, WBTC">
                <input
                  value={form.tokenName}
                  onChange={e => setForm(f => ({ ...f, tokenName: e.target.value }))}
                  className="arcane-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                  placeholder="Enter token symbol..."
                />
              </FormField>

              <FormField label={`TARGET MULTIPLIER: ${form.targetMultiplier}x`} hint="Higher = more risk">
                <input type="range" min={1.1} max={20} step={0.1}
                  value={form.targetMultiplier}
                  onChange={e => setForm(f => ({ ...f, targetMultiplier: parseFloat(e.target.value) }))}
                  className="w-full accent-yellow-500" />
              </FormField>

              <FormField label={`DURATION: ${form.duration} days`} hint="Signal time horizon">
                <input type="range" min={1} max={365} step={1}
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                  className="w-full accent-purple-500" />
              </FormField>

              <FormField label={`CONFIDENCE: ${form.confidence}%`} hint="How sure are you?">
                <input type="range" min={10} max={95} step={1}
                  value={form.confidence}
                  onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-500" />
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[10px] text-red-400">Low</span>
                  <span className="font-mono text-[10px] text-emerald-400">High</span>
                </div>
              </FormField>

              <FormField label="STAKE AMOUNT (USDT)" hint="Simulated stake">
                <input type="number" min={10} max={100000}
                  value={form.stakeAmount}
                  onChange={e => setForm(f => ({ ...f, stakeAmount: parseInt(e.target.value) || 0 }))}
                  className="arcane-input w-full rounded-lg px-4 py-2.5 font-mono text-sm" />
              </FormField>

              {/* Risk Preview */}
              {form.tokenName && (
                <div className="rounded-lg p-3 border border-purple-500/20 bg-purple-900/20">
                  <div className="flex justify-between items-center">
                    <span className="font-ui text-xs text-purple-300">Risk Score</span>
                    <span className="font-mono text-sm" style={{
                      color: riskScore > 0.6 ? '#ff1744' : riskScore > 0.3 ? '#fbbf24' : '#00e676'
                    }}>
                      {(riskScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-purple-900 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${riskScore * 100}%`,
                        background: riskScore > 0.6 ? '#ff1744' : riskScore > 0.3 ? '#fbbf24' : '#00e676',
                      }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!isConnected || !form.tokenName || isProcessing}
                className="w-full py-3.5 rounded-xl font-display text-base tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(123,46,200,0.2))',
                  border: '1px solid rgba(245,158,11,0.5)',
                  color: '#fbbf24',
                  boxShadow: '0 0 20px rgba(245,158,11,0.15)',
                }}
              >
                {isProcessing ? '⚡ PROCESSING...' : !isConnected ? '🔒 CONNECT WALLET' : '⚔ ENTER BATTLE'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Player stats */}
            <div className="arcane-card rounded-xl p-4 border border-purple-500/25">
              <div className="font-display text-purple-300 text-xs tracking-widest mb-3">KNIGHT STATUS</div>
              <div className="space-y-2">
                <StatRow label="Wins" value={player.wins.toString()} color="#00e676" />
                <StatRow label="Losses" value={player.losses.toString()} color="#ff6b6b" />
                <StatRow label="Win Rate" value={`${player.winrate.toFixed(1)}%`} color="#fbbf24" />
                <StatRow label="Multiplier" value={`${player.multiplier.toFixed(2)}x`} color="#00e5ff" />
              </div>
            </div>

            <AICompanion insights={aiInsights} isAnalyzing={isProcessing} />
          </div>
        </div>
      </main>

      <BattleResultModal result={result} onClose={() => setResult(null)} leveledUp={leveledUp} />
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="font-ui text-xs text-yellow-400/80 tracking-wider font-bold">{label}</label>
        {hint && <span className="font-body italic text-purple-400/60 text-xs">{hint}</span>}
      </div>
      {children}
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
