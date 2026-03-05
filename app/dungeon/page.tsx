'use client';

import { useState, useEffect } from 'react';
import HUD from '@/components/HUD';
import AICompanion from '@/components/AICompanion';
import { useWallet } from '@/lib/walletContext';
import { generateDungeons, enterDungeon, Dungeon, DungeonResult } from '@/lib/dungeonEngine';
import { addXP } from '@/lib/xpSystem';
import Link from 'next/link';

const DIFFICULTY_CONFIG = {
  NOVICE: { color: '#00e676', icon: '🌿', border: 'rgba(0,230,118,0.3)' },
  ADEPT: { color: '#fbbf24', icon: '🔥', border: 'rgba(245,158,11,0.3)' },
  EXPERT: { color: '#fb923c', icon: '⚡', border: 'rgba(251,146,60,0.3)' },
  LEGENDARY: { color: '#ff1744', icon: '💀', border: 'rgba(255,23,68,0.4)' },
};

export default function DungeonPage() {
  const { player, updatePlayer, isConnected } = useWallet();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [selectedDungeon, setSelectedDungeon] = useState<Dungeon | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [result, setResult] = useState<DungeonResult | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  useEffect(() => {
    setDungeons(generateDungeons());
  }, []);

  const handleEnter = async (dungeon: Dungeon) => {
    if (!isConnected) return;
    setIsEntering(true);
    setResult(null);
    setSelectedDungeon(dungeon);

    await new Promise(r => setTimeout(r, 2000));

    const dungeonResult = enterDungeon(dungeon, player.level);
    setResult(dungeonResult);

    const insights: string[] = [];
    if (dungeon.whalePercent > 60) insights.push(`🐋 Dungeon overrun by whale entities. Liquidity exit blocked.`);
    if (dungeon.apy > 100) insights.push(`⚡ Unstable yield runes detected — ${dungeon.apy.toFixed(0)}% APY signals danger.`);
    insights.push(dungeonResult.success
      ? `✅ Rune alignment favorable. Victory at ${(dungeonResult.damageDealt / dungeonResult.bossHP * 100).toFixed(0)}% efficiency.`
      : `❌ Dungeon boss overwhelmed your signal. Increase level before retry.`);
    if (dungeonResult.artifact) insights.push(`💎 Artifact secured: "${dungeonResult.artifact}"`);
    setAiInsights(insights);

    if (dungeonResult.success) {
      const newArtifacts = dungeonResult.artifact
        ? Array.from(new Set([...player.artifacts, dungeonResult.artifact]))
        : player.artifacts;
      const { newPlayer } = addXP({ ...player, artifacts: newArtifacts }, dungeonResult.xpGained);
      updatePlayer(newPlayer);
    }

    setIsEntering(false);
  };

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div className="font-display text-2xl text-purple-400 tracking-widest">💀 VAULT DUNGEON</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dungeon Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dungeons.map(dungeon => {
                const cfg = DIFFICULTY_CONFIG[dungeon.difficulty];
                const isActive = selectedDungeon?.id === dungeon.id && isEntering;

                return (
                  <div key={dungeon.id}
                    className="arcane-card rounded-xl p-5 border cursor-pointer hover:scale-[1.01] transition-all"
                    style={{ borderColor: cfg.border }}
                    onClick={() => !isEntering && handleEnter(dungeon)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-2xl">{cfg.icon}</div>
                      <div className="font-mono text-[10px] px-2 py-1 rounded font-bold"
                        style={{ color: cfg.color, background: `${cfg.color}15` }}>
                        {dungeon.difficulty}
                      </div>
                    </div>

                    <div className="font-display text-sm tracking-wider mb-1" style={{ color: cfg.color }}>
                      {dungeon.name}
                    </div>
                    <div className="font-body italic text-purple-400/60 text-xs mb-3 leading-relaxed">
                      {dungeon.lore}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                      <MetricItem label="APY" value={`${dungeon.apy.toFixed(0)}%`} />
                      <MetricItem label="Liquidity" value={`$${dungeon.liquidity.toFixed(1)}M`} />
                      <MetricItem label="Whale" value={`${dungeon.whalePercent.toFixed(0)}%`} />
                      <MetricItem label="Stability" value={dungeon.stability.toFixed(0)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs text-yellow-400">+{dungeon.xpReward} XP</div>
                      {dungeon.artifact && (
                        <div className="font-mono text-[10px] text-yellow-400/70 flex items-center gap-1">
                          <span>💎</span>
                          <span>Artifact</span>
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="mt-3 pt-3 border-t border-purple-500/20 text-center">
                        <div className="font-display text-xs text-yellow-400 processing-blink tracking-widest">
                          ⚔ ENTERING DUNGEON...
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Result Panel */}
            {result && selectedDungeon && (
              <div
                className="arcane-card rounded-xl p-5 border"
                style={{
                  borderColor: result.success ? 'rgba(0,230,118,0.4)' : 'rgba(255,23,68,0.4)',
                  boxShadow: result.success ? '0 0 20px rgba(0,230,118,0.1)' : '0 0 20px rgba(255,23,68,0.1)',
                }}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{result.success ? '🏆' : '💀'}</div>
                  <div
                    className="font-display text-lg tracking-widest"
                    style={{ color: result.success ? '#00e676' : '#ff1744' }}
                  >
                    {result.success ? 'CONQUERED' : 'DEFEATED'}
                  </div>
                </div>

                <div className="font-body italic text-purple-200/80 text-xs text-center mb-4 leading-relaxed">
                  "{result.message}"
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-ui text-xs text-purple-400">XP Gained</span>
                    <span className="font-mono text-xs text-yellow-400">+{result.xpGained}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-ui text-xs text-purple-400">Damage Dealt</span>
                    <span className="font-mono text-xs text-orange-400">{result.damageDealt}/{result.bossHP}</span>
                  </div>
                  {result.artifact && (
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-2 mt-2 text-center">
                      <div className="font-mono text-[10px] text-yellow-400">💎 ARTIFACT UNLOCKED</div>
                      <div className="font-body italic text-yellow-300/80 text-xs mt-0.5">{result.artifact}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Player Level */}
            <div className="arcane-card rounded-xl p-4 border border-purple-500/20">
              <div className="font-display text-purple-300 text-xs tracking-widest mb-2">YOUR POWER</div>
              <div className="font-mono text-2xl text-yellow-400 font-bold">LVL {player.level}</div>
              <div className="font-body italic text-purple-400/60 text-xs mt-1">
                Higher level = better dungeon odds
              </div>
            </div>

            <AICompanion insights={aiInsights} isAnalyzing={isEntering} />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="font-mono text-[9px] text-purple-500 block">{label}</span>
      <span className="font-mono text-xs text-purple-200">{value}</span>
    </div>
  );
}
