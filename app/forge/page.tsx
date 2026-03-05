'use client';

import { useState } from 'react';
import HUD from '@/components/HUD';
import AICompanion from '@/components/AICompanion';
import { useWallet } from '@/lib/walletContext';
import { calculateStake, VAULT_OPTIONS, VaultOption } from '@/lib/stakingEngine';
import { addXP } from '@/lib/xpSystem';
import Link from 'next/link';
import MarketTicker from '@/components/MarketTicker';

export default function ForgePage() {
  const { player, updatePlayer, isConnected, signTransaction } = useWallet();
  const [amount, setAmount] = useState(1000);
  const [duration, setDuration] = useState(90);
  const [autoCompound, setAutoCompound] = useState(true);
  const [selectedVault, setSelectedVault] = useState<VaultOption | null>(null);
  const [isForging, setIsForging] = useState(false);
  const [forgeComplete, setForgeComplete] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const stake = calculateStake({ amount, duration, autoCompound });

  const handleForge = async () => {
    if (!isConnected || !selectedVault) return;
    setIsForging(true);
    await signTransaction(`FORGE:${amount}:${duration}:${selectedVault.name}`);
    await new Promise(r => setTimeout(r, 2000));

    const insights = [
      `🔥 Yield forge initiated on ${selectedVault.name}.`,
      `💰 Projected reward: ${stake.projectedReward.toFixed(4)} ${selectedVault.token} over ${duration} days.`,
      autoCompound ? `🔄 Auto-compounding active — 8% bonus yield applied.` : `📊 Manual harvest mode enabled.`,
      stake.apr > 50 ? `⚠ High APR vault detected. Monitor stability runes closely.` : `✅ APR within safe parameters.`,
    ];
    setAiInsights(insights);

    const { newPlayer } = addXP({
      ...player,
      questProgress: {
        ...player.questProgress,
        yieldsForged: player.questProgress.yieldsForged + 1,
      }
    }, stake.xpReward);
    updatePlayer(newPlayer);
    setIsForging(false);
    setForgeComplete(true);
  };

  const riskColor = (risk: VaultOption['risk']) =>
    risk === 'LOW' ? '#00e676' : risk === 'MEDIUM' ? '#fbbf24' : '#ff1744';

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div className="font-display text-2xl text-orange-400 tracking-widest">🔥 YIELD FORGE</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vault Selection */}
          <div className="lg:col-span-2 space-y-4">
            <div className="arcane-card rounded-xl p-6 border border-orange-500/25">
              <div className="font-display text-orange-400 text-sm tracking-widest mb-4">SELECT FORGE VAULT</div>
              <div className="space-y-2">
                {VAULT_OPTIONS.map(vault => (
                  <button key={vault.name} onClick={() => setSelectedVault(vault)}
                    className="w-full text-left rounded-lg p-4 border transition-all"
                    style={{
                      border: selectedVault?.name === vault.name
                        ? '1px solid rgba(245,158,11,0.6)'
                        : '1px solid rgba(123,46,200,0.2)',
                      background: selectedVault?.name === vault.name
                        ? 'rgba(245,158,11,0.08)'
                        : 'rgba(7,17,51,0.5)',
                    }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-ui text-sm text-yellow-300 font-bold">{vault.name}</div>
                        <div className="font-mono text-xs text-purple-400">{vault.protocol} · {vault.token}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-yellow-400 font-bold">{vault.apr}% APR</div>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          <span className="font-mono text-xs text-purple-400">{vault.tvl}</span>
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ color: riskColor(vault.risk), background: `${riskColor(vault.risk)}20` }}>
                            {vault.risk}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Forge Config */}
            <div className="arcane-card rounded-xl p-6 border border-orange-500/25">
              <div className="font-display text-orange-400 text-sm tracking-widest mb-4">FORGE PARAMETERS</div>
              <div className="space-y-4">
                <div>
                  <label className="font-ui text-xs text-orange-400/80 tracking-wider font-bold mb-1.5 block">
                    STAKE AMOUNT (USDT) — {amount.toLocaleString()}
                  </label>
                  <input type="range" min={100} max={100000} step={100}
                    value={amount}
                    onChange={e => setAmount(parseInt(e.target.value))}
                    className="w-full accent-orange-500" />
                </div>

                <div>
                  <label className="font-ui text-xs text-orange-400/80 tracking-wider font-bold mb-1.5 block">
                    DURATION — {duration} days
                  </label>
                  <input type="range" min={7} max={365} step={7}
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    className="w-full accent-orange-500" />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <button onClick={() => setAutoCompound(v => !v)}
                    className="w-10 h-5 rounded-full transition-all relative"
                    style={{ background: autoCompound ? '#f59e0b' : 'rgba(123,46,200,0.3)' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: autoCompound ? '22px' : '2px' }} />
                  </button>
                  <span className="font-ui text-sm text-purple-200">Auto-Compound</span>
                  {autoCompound && <span className="font-mono text-xs text-yellow-400">+8% bonus</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-4">
            <div className="arcane-card rounded-xl p-5 border border-yellow-500/25">
              <div className="font-display text-yellow-400 text-xs tracking-widest mb-4">FORGE PREVIEW</div>
              <div className="space-y-3">
                <SummaryRow label="APR" value={`${stake.apr.toFixed(2)}%`} color="#fbbf24" />
                <SummaryRow label="Time Multiplier" value={`${stake.timeMultiplier.toFixed(3)}x`} color="#c087f5" />
                <SummaryRow label="Auto Compound" value={stake.autoCompoundBonus > 0 ? `+${(stake.autoCompoundBonus * 100).toFixed(0)}%` : 'OFF'} color="#00e5ff" />
                <div className="border-t border-yellow-500/20 pt-3">
                  <SummaryRow label="Daily Reward" value={`${stake.dailyReward.toFixed(4)}`} color="#fbbf24" />
                  <SummaryRow label="Total Reward" value={`+${stake.projectedReward.toFixed(2)}`} color="#00e676" />
                  <SummaryRow label="Final Total" value={stake.projectedTotal.toFixed(2)} color="#fbbf24" />
                </div>
                <SummaryRow label="XP Reward" value={`+${stake.xpReward} XP`} color="#9b4de8" />
              </div>

              {forgeComplete ? (
                <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                  <div className="font-display text-emerald-400 text-sm tracking-widest">🔥 FORGED!</div>
                  <div className="font-mono text-xs text-emerald-300/70 mt-1">+{stake.xpReward} XP earned</div>
                  <button onClick={() => setForgeComplete(false)} className="mt-2 text-xs text-purple-400 font-ui hover:text-yellow-400 transition-colors">
                    Forge again →
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleForge}
                  disabled={!isConnected || !selectedVault || isForging}
                  className="w-full mt-4 py-3 rounded-xl font-display text-sm tracking-widest transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(245,158,11,0.2))',
                    border: '1px solid rgba(249,115,22,0.5)',
                    color: '#fb923c',
                  }}
                >
                  {isForging ? '🔥 FORGING...' : !selectedVault ? 'SELECT VAULT' : '🔥 FORGE YIELD'}
                </button>
              )}
            </div>

            {/* Live reference prices for the selected vault tokens */}
            <div className="arcane-card rounded-xl p-4 border border-yellow-500/15">
              <MarketTicker compact />
            </div>

            <AICompanion insights={aiInsights} isAnalyzing={isForging} />
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-ui text-xs text-purple-400">{label}</span>
      <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
