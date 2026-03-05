'use client';

import { useState } from 'react';
import HUD from '@/components/HUD';
import AICompanion from '@/components/AICompanion';
import { useWallet } from '@/lib/walletContext';
import { scanVault, generateRadarData, getRiskLevel, generateAIInsights, VaultMetrics } from '@/lib/riskEngine';
import { addXP } from '@/lib/xpSystem';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function RadarPage() {
  const { player, updatePlayer, isConnected } = useWallet();
  const [vaultInput, setVaultInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const handleScan = async () => {
    if (!isConnected) return;
    setIsScanning(true);
    setScanProgress(0);
    setMetrics(null);

    // Animate scan progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 40));
      setScanProgress(i);
    }

    const result = scanVault(vaultInput || `vault_${scanCount}`);
    setMetrics(result);
    setScanCount(c => c + 1);
    setIsScanning(false);

    // Update quest progress and XP
    const { newPlayer } = addXP({
      ...player,
      questProgress: {
        ...player.questProgress,
        vaultsScanned: player.questProgress.vaultsScanned + 1,
      }
    }, 15);
    updatePlayer(newPlayer);
  };

  const radarData = metrics ? generateRadarData(metrics) : [];
  const riskLevel = metrics ? getRiskLevel(metrics.riskIndex) : null;
  const aiInsights = metrics ? generateAIInsights(metrics) : [];

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div className="font-display text-2xl text-cyan-400 tracking-widest">📡 RISK RADAR</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Panel */}
          <div className="arcane-card rounded-xl p-6 border border-cyan-500/25">
            <div className="font-display text-cyan-400 text-sm tracking-widest mb-6 pb-3 border-b border-cyan-500/20">
              VAULT SCANNER
            </div>

            <div className="mb-5">
              <label className="font-ui text-xs text-cyan-400/80 tracking-wider font-bold mb-1.5 block">
                VAULT ADDRESS OR NAME
              </label>
              <input
                value={vaultInput}
                onChange={e => setVaultInput(e.target.value)}
                className="arcane-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                placeholder="0x... or vault name"
              />
            </div>

            {/* Radar Animation */}
            <div className="relative flex items-center justify-center my-8">
              <div className="relative w-48 h-48">
                {/* Concentric rings */}
                {[1, 2, 3].map(i => (
                  <div key={i}
                    className="absolute inset-0 rounded-full border border-cyan-500/20"
                    style={{
                      margin: `${i * 16}px`,
                      boxShadow: isScanning ? `0 0 ${10 + i * 5}px rgba(0,229,255,0.1)` : 'none',
                    }}
                  />
                ))}

                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: '#00e5ff',
                      boxShadow: '0 0 15px rgba(0,229,255,0.8)',
                    }}
                  />
                </div>

                {/* Sweep arm */}
                {isScanning && (
                  <div
                    className="absolute inset-0 animate-radar-sweep origin-center"
                    style={{ transformOrigin: 'center center' }}
                  >
                    <div
                      className="absolute top-0 left-1/2 w-px h-1/2 origin-bottom"
                      style={{
                        background: 'linear-gradient(to top, transparent, rgba(0,229,255,0.8))',
                        transformOrigin: 'bottom center',
                      }}
                    />
                  </div>
                )}

                {/* Progress ring */}
                {isScanning && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="96" cy="96" r="90"
                      fill="none"
                      stroke="rgba(0,229,255,0.4)"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 90}`}
                      strokeDashoffset={`${2 * Math.PI * 90 * (1 - scanProgress / 100)}`}
                      style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                    />
                  </svg>
                )}

                {/* Result score */}
                {metrics && !isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <div className="font-mono text-2xl font-bold" style={{ color: riskLevel?.color }}>
                      {metrics.riskIndex.toFixed(0)}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: riskLevel?.color }}>
                      {riskLevel?.label}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isScanning && (
              <div className="text-center mb-4">
                <div className="font-mono text-cyan-400 text-sm processing-blink">
                  SCANNING... {scanProgress}%
                </div>
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={!isConnected || isScanning}
              className="w-full py-3.5 rounded-xl font-display text-base tracking-widest transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,191,165,0.1))',
                border: '1px solid rgba(0,229,255,0.4)',
                color: '#00e5ff',
                boxShadow: '0 0 20px rgba(0,229,255,0.1)',
              }}
            >
              {isScanning ? '📡 SCANNING...' : !isConnected ? '🔒 CONNECT WALLET' : '📡 SCAN VAULT'}
            </button>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {metrics && !isScanning ? (
              <>
                {/* Radar Chart */}
                <div className="arcane-card rounded-xl p-4 border border-cyan-500/20">
                  <div className="font-display text-cyan-400 text-xs tracking-widest mb-3">SIGNAL ANALYSIS</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(0,229,255,0.15)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#a78bfa', fontSize: 11, fontFamily: 'Rajdhani' }} />
                      <Radar
                        name="Vault" dataKey="value"
                        stroke={riskLevel?.color}
                        fill={riskLevel?.color}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="APY" value={`${metrics.apy.toFixed(1)}%`} icon="📈"
                    color={metrics.apy > 100 ? '#ff6b6b' : '#00e676'} />
                  <MetricCard label="Liquidity" value={`$${metrics.liquidity.toFixed(1)}M`} icon="💧"
                    color={metrics.liquidity < 5 ? '#ff6b6b' : '#00e5ff'} />
                  <MetricCard label="Whale %" value={`${metrics.whaleConcentration.toFixed(1)}%`} icon="🐋"
                    color={metrics.whaleConcentration > 60 ? '#ff6b6b' : '#fbbf24'} />
                  <MetricCard label="Stability" value={`${metrics.stabilityScore.toFixed(1)}`} icon="🔮"
                    color={metrics.stabilityScore < 40 ? '#ff6b6b' : '#00e676'} />
                </div>
              </>
            ) : !isScanning ? (
              <div className="arcane-card rounded-xl p-8 border border-cyan-500/20 flex items-center justify-center">
                <div className="text-center text-purple-400/50">
                  <div className="text-4xl mb-3">📡</div>
                  <div className="font-body italic text-sm">Initiate a vault scan to reveal its secrets...</div>
                </div>
              </div>
            ) : null}

            <AICompanion insights={aiInsights} isAnalyzing={isScanning} />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="rounded-lg p-3 border border-purple-500/20 bg-purple-900/20 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="font-mono text-xs" style={{ color }}>{value}</div>
        <div className="font-ui text-[10px] text-purple-400">{label}</div>
      </div>
    </div>
  );
}
