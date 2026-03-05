'use client';

import { ContributorProfile, getLevelColor, getLevelIcon, getNextLevelThreshold, BADGE_CATALOG, RARITY_COLORS } from '@/lib/reputation';

interface ReputationBadgeProps {
  profile: ContributorProfile;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showBadges?: boolean;
}

export default function ReputationBadge({
  profile,
  size = 'md',
  showProgress = false,
  showBadges = false,
}: ReputationBadgeProps) {
  const color = getLevelColor(profile.level);
  const icon  = getLevelIcon(profile.level);
  const thresholds = getNextLevelThreshold(profile.reputationScore);
  const progressPct = Math.min(100, Math.floor(
    ((profile.reputationScore - thresholds.current) / (thresholds.next - thresholds.current)) * 100
  ));

  const avatarSize = size === 'sm' ? 'w-8 h-8 text-base' : size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-10 h-10 text-xl';
  const nameSize   = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';
  const metaSize   = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0`}
          style={{
            background: `radial-gradient(circle, ${color}20, ${color}08)`,
            border: `1.5px solid ${color}40`,
            boxShadow: `0 0 12px ${color}20`,
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Level badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-display ${nameSize} font-bold tracking-wider`}
              style={{ color }}
            >
              {profile.level}
            </span>
            <span
              className={`font-mono ${metaSize} px-1.5 py-0.5 rounded`}
              style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}
            >
              {profile.reputationScore.toLocaleString()} REP
            </span>
          </div>

          {/* Address */}
          <div className={`font-mono ${metaSize} text-purple-400/50 truncate mt-0.5`}>
            {profile.displayName}
          </div>

          {/* Progress bar (optional) */}
          {showProgress && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[8px] text-purple-400/40">
                  {profile.reputationScore} / {thresholds.next}
                </span>
                <span className="font-mono text-[8px]" style={{ color: `${color}70` }}>
                  {progressPct}%
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(123,46,200,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: `linear-gradient(90deg, ${color}60, ${color})`,
                    boxShadow: `0 0 4px ${color}40`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badges row (optional) */}
      {showBadges && profile.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {profile.badges.slice(0, 6).map(badgeId => {
            const badge = BADGE_CATALOG[badgeId];
            const rarityColor = RARITY_COLORS[badge.rarity];
            return (
              <div
                key={badgeId}
                title={`${badge.label}: ${badge.description}`}
                className="group relative w-7 h-7 rounded-lg flex items-center justify-center cursor-default transition-transform hover:scale-110"
                style={{
                  background: `${rarityColor}12`,
                  border: `1px solid ${rarityColor}30`,
                }}
              >
                <span className="text-sm">{badge.icon}</span>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                  <div
                    className="rounded-lg px-2 py-1.5 whitespace-nowrap border"
                    style={{
                      background: 'rgba(4,13,36,0.98)',
                      borderColor: `${rarityColor}40`,
                      boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
                    }}
                  >
                    <div className="font-mono text-[9px] font-bold" style={{ color: rarityColor }}>
                      {badge.label}
                    </div>
                    <div className="font-mono text-[8px] text-purple-400/50">{badge.description}</div>
                  </div>
                  <div
                    className="w-0 h-0 mx-auto"
                    style={{
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `4px solid ${rarityColor}40`,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {profile.badges.length > 6 && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[9px] text-purple-400/40"
              style={{ background: 'rgba(123,46,200,0.08)', border: '1px solid rgba(123,46,200,0.15)' }}>
              +{profile.badges.length - 6}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
