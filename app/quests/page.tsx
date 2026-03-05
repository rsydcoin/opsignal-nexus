'use client';

import { useEffect, useState } from 'react';
import HUD from '@/components/HUD';
import { useWallet } from '@/lib/walletContext';
import { addXP } from '@/lib/xpSystem';
import Link from 'next/link';

interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
  required: number;
  progressKey: 'battlesWon' | 'vaultsScanned' | 'yieldsForged';
  color: string;
}

const DAILY_QUESTS: Quest[] = [
  {
    id: 'battle_win',
    title: 'First Blood',
    description: 'Win 1 signal battle',
    xpReward: 50,
    icon: '⚔',
    required: 1,
    progressKey: 'battlesWon',
    color: '#fbbf24',
  },
  {
    id: 'scan_vaults',
    title: 'Arcane Scanner',
    description: 'Scan 2 vaults with the risk radar',
    xpReward: 35,
    icon: '📡',
    required: 2,
    progressKey: 'vaultsScanned',
    color: '#00e5ff',
  },
  {
    id: 'forge_yield',
    title: 'Forge Master',
    description: 'Forge 1 yield position',
    xpReward: 40,
    icon: '🔥',
    required: 1,
    progressKey: 'yieldsForged',
    color: '#fb923c',
  },
];

const WEEKLY_BONUS = [
  { title: 'Arena Gladiator', desc: 'Win 3 arena challenges', xp: 150, icon: '🗡', done: false },
  { title: 'Dungeon Delver', desc: 'Complete 2 dungeons', xp: 200, icon: '💀', done: false },
  { title: 'Signal Sage', desc: 'Achieve 70%+ win rate', xp: 250, icon: '🔮', done: false },
];

export default function QuestsPage() {
  const { player, updatePlayer, isConnected } = useWallet();
  const [claimedToday, setClaimedToday] = useState<string[]>([]);

  useEffect(() => {
    setClaimedToday(player.questProgress.completedToday || []);
  }, [player]);

  const handleClaim = (quest: Quest) => {
    const progress = player.questProgress[quest.progressKey];
    if (progress < quest.required) return;
    if (claimedToday.includes(quest.id)) return;

    const newClaimed = [...claimedToday, quest.id];
    setClaimedToday(newClaimed);

    const { newPlayer } = addXP({
      ...player,
      questProgress: {
        ...player.questProgress,
        completedToday: newClaimed,
      }
    }, quest.xpReward);
    updatePlayer(newPlayer);
  };

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div className="font-display text-2xl text-yellow-400 tracking-widest">📜 QUEST LOG</div>
        </div>

        {/* Daily Quests */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display text-yellow-400 text-sm tracking-widest">DAILY QUESTS</div>
            <div className="font-mono text-xs text-purple-400">
              Resets at midnight UTC
            </div>
          </div>

          <div className="space-y-3">
            {DAILY_QUESTS.map(quest => {
              const progress = player.questProgress[quest.progressKey];
              const isComplete = progress >= quest.required;
              const isClaimed = claimedToday.includes(quest.id);
              const pct = Math.min((progress / quest.required) * 100, 100);

              return (
                <div key={quest.id}
                  className="arcane-card rounded-xl p-5 border transition-all"
                  style={{
                    borderColor: isClaimed ? 'rgba(0,230,118,0.3)' : isComplete ? `${quest.color}40` : 'rgba(123,46,200,0.25)',
                    background: isClaimed ? 'rgba(0,230,118,0.05)' : undefined,
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{quest.icon}</div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-display text-sm tracking-wider" style={{ color: quest.color }}>
                          {quest.title}
                        </div>
                        <div className="font-mono text-xs text-yellow-400">+{quest.xpReward} XP</div>
                      </div>
                      <div className="font-body italic text-purple-300/70 text-xs mb-2">{quest.description}</div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-purple-900/60 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: isClaimed ? '#00e676' : quest.color,
                            }} />
                        </div>
                        <span className="font-mono text-xs text-purple-400">
                          {Math.min(progress, quest.required)}/{quest.required}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaim(quest)}
                      disabled={!isConnected || !isComplete || isClaimed}
                      className="px-4 py-2 rounded-lg font-display text-xs tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: isClaimed ? 'rgba(0,230,118,0.15)' : isComplete ? `${quest.color}20` : 'rgba(123,46,200,0.1)',
                        border: `1px solid ${isClaimed ? 'rgba(0,230,118,0.4)' : isComplete ? `${quest.color}60` : 'rgba(123,46,200,0.2)'}`,
                        color: isClaimed ? '#00e676' : isComplete ? quest.color : '#6b4db8',
                      }}
                    >
                      {isClaimed ? '✓ CLAIMED' : isComplete ? 'CLAIM' : 'LOCKED'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Bonus */}
        <div>
          <div className="font-display text-purple-400 text-sm tracking-widest mb-4">WEEKLY CHALLENGES</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {WEEKLY_BONUS.map((bonus, i) => (
              <div key={i}
                className="arcane-card rounded-xl p-4 border border-purple-500/20 text-center">
                <div className="text-3xl mb-2">{bonus.icon}</div>
                <div className="font-display text-xs text-purple-300 tracking-wider mb-1">{bonus.title}</div>
                <div className="font-body italic text-purple-400/60 text-xs mb-3">{bonus.desc}</div>
                <div className="font-mono text-yellow-400 text-sm">+{bonus.xp} XP</div>
                <div className="mt-2 font-mono text-[10px] text-purple-500/60 tracking-wider">IN PROGRESS</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lore */}
        <div className="mt-8 arcane-card rounded-xl p-5 border border-yellow-500/15">
          <div className="font-display text-yellow-400/50 text-xs tracking-widest mb-2">QUEST LORE</div>
          <p className="font-body italic text-purple-300/50 text-sm leading-relaxed">
            "Every signal hunter must prove themselves in the daily trials. Only those who complete the sacred quests
            shall be worthy of the Nexus's deepest secrets."
          </p>
        </div>
      </main>
    </div>
  );
}
