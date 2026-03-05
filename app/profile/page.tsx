'use client';

import { useEffect, useState, useMemo } from 'react';
import HUD from '@/components/HUD';
import ReputationBadge from '@/components/ReputationBadge';
import { useWallet } from '@/lib/walletContext';
import {
  loadContributorProfile, ContributorProfile, BADGE_CATALOG, BadgeId,
  getLevelColor, getLevelIcon, getNextLevelThreshold, RARITY_COLORS,
} from '@/lib/reputation';
import { loadObserverStats, ObserverStats, getRankColor } from '@/lib/opnetSignals';
import { getWalletRewardStats } from '@/lib/rewards';
import { xpProgress, getLevelTitle } from '@/lib/xpSystem';
import Link from 'next/link';

export default function ProfilePage() {
  const { walletAddress, isConnected, player, connectWallet } = useWallet();

  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [observerStats, setObserverStats] = useState<ObserverStats | null>(null);
  const [rewardStats, setRewardStats] = useState({ totalSent: 0, rewardCount: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'signals'>('overview');

  useEffect(() => {
    if (!walletAddress) return;
    setProfile(loadContributorProfile(walletAddress));
    setObserverStats(loadObserverStats(walletAddress));
    setRewardStats(getWalletRewardStats(walletAddress));
  }, [walletAddress]);

  const xp = xpProgress(player.xp);
  const rankColor = observerStats ? getRankColor(observerStats.rank) : '#a78bfa';
  const levelTitle = getLevelTitle(player.level);

  const allBadges = useMemo(() => {
    if (!profile) return [];
    return profile.badges.map(id => ({ id, badge: BADGE_CATALOG[id] }));
  }, [profile]);

  const unlockedBadgeIds = new Set(profile?.badges ?? []);
  const allBadgeIds = Object.keys(BADGE_CATALOG) as BadgeId[];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#020818]">
        <HUD />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-sm px-4">
            <div className="text-5xl mb-4">👤</div>
            <div className="font-display text-xl text-yellow-400 tracking-widest mb-3">SIGNAL PROFILE</div>
            <p className="font-body italic text-purple-300/60 text-sm mb-6">
              Connect your wallet to view your signal reputation, badges, and contribution history.
            </p>
            <button onClick={connectWallet}
              className="px-6 py-3 rounded-xl font-display text-sm tracking-widest transition-all"
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
              ⚡ CONNECT WALLET
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020818]">
      <HUD />

      {/* Grid bg */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(123,46,200,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(123,46,200,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6">

        {/* Back nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="font-ui text-sm text-purple-400 hover:text-yellow-400 transition-colors">← Hub</Link>
          <span className="text-purple-600/40">/</span>
          <span className="font-mono text-xs text-purple-400/50">Profile</span>
        </div>

        {/* ── Hero card ── */}
        <div className="rounded-2xl border overflow-hidden mb-5"
          style={{
            background: 'linear-gradient(145deg, rgba(7,17,51,0.98), rgba(22,8,44,0.98))',
            borderColor: `${rankColor}30`,
            boxShadow: `0 0 40px ${rankColor}10`,
          }}>
          {/* Top gradient stripe */}
          <div className="h-1" style={{ background: `linear-gradient(90deg, transparent, ${rankColor}, transparent)` }} />

          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

              {/* Big avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                  style={{
                    background: `radial-gradient(circle, ${rankColor}20, ${rankColor}06)`,
                    border: `2px solid ${rankColor}40`,
                    boxShadow: `0 0 24px ${rankColor}20`,
                  }}>
                  {profile ? getLevelIcon(profile.level) : '👤'}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#020818]" />
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <div className="font-display text-lg text-yellow-400 tracking-wider truncate">
                    {levelTitle}
                  </div>
                  {profile && (
                    <span className="font-mono text-xs px-2 py-1 rounded-lg font-bold"
                      style={{
                        background: `${getLevelColor(profile.level)}15`,
                        border: `1px solid ${getLevelColor(profile.level)}35`,
                        color: getLevelColor(profile.level),
                      }}>
                      {profile.level}
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm text-purple-300/70 mb-3 truncate">
                  {walletAddress}
                </div>

                {/* XP progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-purple-400/50">
                      LEVEL {xp.level} · {xp.current} / {xp.needed} XP
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: rankColor }}>
                      {Math.round(xp.percentage)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(123,46,200,0.15)' }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${xp.percentage}%`,
                        background: `linear-gradient(90deg, ${rankColor}80, ${rankColor})`,
                        boxShadow: `0 0 8px ${rankColor}40`,
                      }} />
                  </div>
                </div>
              </div>

              {/* Reputation score */}
              {profile && (
                <div className="flex-shrink-0 text-center rounded-xl px-5 py-3 border"
                  style={{
                    background: `${getLevelColor(profile.level)}08`,
                    borderColor: `${getLevelColor(profile.level)}25`,
                  }}>
                  <div className="font-mono text-2xl font-bold" style={{ color: getLevelColor(profile.level) }}>
                    {profile.reputationScore.toLocaleString()}
                  </div>
                  <div className="font-mono text-[9px] text-purple-400/50 tracking-widest mt-0.5">REPUTATION</div>
                  {(() => {
                    const t = getNextLevelThreshold(profile.reputationScore);
                    return (
                      <div className="font-mono text-[9px] text-purple-400/30 mt-1">
                        {t.next - profile.reputationScore} to next tier
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="SIGNALS POSTED" value={(profile?.signalsPosted ?? 0).toString()} color="#00e5ff" icon="📡" />
          <StatCard label="REWARDS RECV'D" value={`${profile?.rewardsReceived ?? 0} OP`} color="#fbbf24" icon="◈" />
          <StatCard label="REWARDS SENT" value={`${rewardStats.totalSent} OP`} color="#c087f5" icon="⚡" />
          <StatCard label="ACCURACY" value={`${Math.round(profile?.accuracy ?? 50)}%`} color="#00e676" icon="🎯" />
        </div>

        {/* Observer stats row */}
        {observerStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard label="SIGNALS LOGGED" value={observerStats.signalsLogged.toString()} color="#00e5ff" icon="⛓" />
            <StatCard label="TIPS SENT" value={observerStats.tipsSent.toString()} color="#c087f5" icon="💎" />
            <StatCard label="OBSERVER XP" value={observerStats.xp.toLocaleString()} color={rankColor} icon="⚔" />
            <StatCard label="OBSERVER RANK" value={observerStats.rank} color={rankColor} icon="🛡" small />
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl"
          style={{ background: 'rgba(123,46,200,0.08)', border: '1px solid rgba(123,46,200,0.15)' }}>
          {(['overview', 'badges', 'signals'] as const).map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg font-display text-xs tracking-widest transition-all"
              style={{
                background: activeTab === tab ? 'rgba(251,191,36,0.12)' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
                color: activeTab === tab ? '#fbbf24' : 'rgba(150,130,190,0.5)',
              }}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}

        {activeTab === 'overview' && profile && (
          <div className="space-y-4">
            {/* Reputation card */}
            <div className="rounded-xl border p-4"
              style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.25)' }}>
              <div className="font-mono text-[9px] text-purple-400/40 tracking-widest mb-4">SIGNAL REPUTATION</div>
              <ReputationBadge profile={profile} size="lg" showProgress showBadges />

              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Signals This Week', value: Math.min(profile.signalsPosted, 12).toString() },
                  { label: 'Avg Signal Rating', value: `${(3.2 + (profile.accuracy - 50) / 50).toFixed(1)} / 5` },
                  { label: 'Popular Signals', value: Math.floor(profile.signalsPosted * 0.15).toString() },
                  { label: 'Ignored Signals',  value: Math.floor(profile.signalsPosted * 0.05).toString() },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b"
                    style={{ borderColor: 'rgba(123,46,200,0.1)' }}>
                    <span className="font-mono text-[10px] text-purple-400/50">{item.label}</span>
                    <span className="font-mono text-[11px] text-purple-200/80">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Level progression */}
            <div className="rounded-xl border p-4"
              style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.25)' }}>
              <div className="font-mono text-[9px] text-purple-400/40 tracking-widest mb-3">LEVEL PROGRESSION</div>
              <div className="space-y-3">
                {(['Explorer', 'Operator', 'Guardian', 'Oracle'] as const).map(level => {
                  const color = getLevelColor(level);
                  const icon  = getLevelIcon(level);
                  const thresholds: Record<string, number> = { Explorer: 0, Operator: 300, Guardian: 900, Oracle: 2500 };
                  const isCurrentLevel = profile.level === level;
                  const isUnlocked = profile.reputationScore >= thresholds[level];
                  return (
                    <div key={level}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 border"
                      style={{
                        background: isCurrentLevel ? `${color}08` : 'transparent',
                        borderColor: isCurrentLevel ? `${color}30` : 'rgba(123,46,200,0.12)',
                        opacity: isUnlocked ? 1 : 0.4,
                      }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                        <span>{icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs" style={{ color }}>{level}</span>
                          {isCurrentLevel && (
                            <span className="font-mono text-[8px] px-1 rounded"
                              style={{ background: `${color}15`, color }}>CURRENT</span>
                          )}
                        </div>
                        <div className="font-mono text-[9px] text-purple-400/40">
                          {thresholds[level].toLocaleString()} REP required
                        </div>
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: isUnlocked ? '#00e676' : 'rgba(123,46,200,0.3)' }}>
                        {isUnlocked ? '✓' : '🔒'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="rounded-xl border overflow-hidden"
            style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.25)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(123,46,200,0.15)' }}>
              <div className="font-mono text-[9px] text-purple-400/40 tracking-widest">
                ACHIEVEMENT BADGES · {allBadges.length} / {allBadgeIds.length} UNLOCKED
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allBadgeIds.map(badgeId => {
                const badge = BADGE_CATALOG[badgeId];
                const unlocked = unlockedBadgeIds.has(badgeId);
                const rarityColor = RARITY_COLORS[badge.rarity];
                return (
                  <div key={badgeId}
                    className="rounded-xl border p-3 flex items-start gap-3 transition-all"
                    style={{
                      background: unlocked ? `${rarityColor}06` : 'rgba(123,46,200,0.04)',
                      borderColor: unlocked ? `${rarityColor}30` : 'rgba(123,46,200,0.12)',
                      opacity: unlocked ? 1 : 0.45,
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{
                        background: unlocked ? `${rarityColor}12` : 'rgba(123,46,200,0.08)',
                        border: `1px solid ${unlocked ? rarityColor + '30' : 'rgba(123,46,200,0.15)'}`,
                      }}>
                      {unlocked ? badge.icon : '🔒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] font-bold truncate"
                        style={{ color: unlocked ? rarityColor : 'rgba(150,130,190,0.4)' }}>
                        {badge.label}
                      </div>
                      <div className="font-mono text-[8px] text-purple-400/40 leading-relaxed mt-0.5">
                        {badge.description}
                      </div>
                      <div className="font-mono text-[8px] mt-1 capitalize"
                        style={{ color: `${rarityColor}60` }}>
                        {badge.rarity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="rounded-xl border overflow-hidden"
            style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.25)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(123,46,200,0.15)' }}>
              <div className="font-mono text-[9px] text-purple-400/40 tracking-widest">SIGNAL HISTORY</div>
            </div>
            {(profile?.signalsPosted ?? 0) === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-3xl mb-3">📡</div>
                <div className="font-display text-yellow-400/60 text-sm tracking-widest mb-2">NO SIGNALS YET</div>
                <p className="font-body italic text-purple-400/40 text-xs">
                  Visit the Observatory to log and earn XP from signals.
                </p>
                <Link href="/observatory"
                  className="inline-block mt-4 px-4 py-2 rounded-lg font-mono text-xs transition-all"
                  style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)', color: '#00e5ff' }}>
                  → Go to Observatory
                </Link>
              </div>
            ) : (
              <div className="p-4">
                <div className="font-body italic text-purple-400/40 text-sm text-center py-4">
                  Signal history persists across sessions. Keep logging signals to build your record.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lore footer */}
        <div className="mt-8 text-center">
          <div className="h-px max-w-xs mx-auto mb-3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent)' }} />
          <p className="font-body italic text-purple-400/25 text-xs">
            "A signal's worth is measured not by its origin, but by the truth it reveals."
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color, icon, small }: {
  label: string; value: string; color: string; icon: string; small?: boolean;
}) {
  return (
    <div className="rounded-xl px-3 py-3 border text-center"
      style={{ background: 'rgba(7,17,51,0.9)', borderColor: `${color}20` }}>
      <div className="text-xl mb-1">{icon}</div>
      <div className={`font-mono font-bold leading-none ${small ? 'text-sm' : 'text-base'}`} style={{ color }}>
        {value}
      </div>
      <div className="font-mono text-[9px] text-purple-400/50 tracking-wider mt-1">{label}</div>
    </div>
  );
}
