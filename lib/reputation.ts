// Signal Contributor Reputation System
// Tracks signal quality, rewards received, and trust scores

export type ReputationLevel = 'Explorer' | 'Operator' | 'Guardian' | 'Oracle';

export interface ContributorProfile {
  address: string;
  displayName: string;          // truncated address or alias
  reputationScore: number;
  level: ReputationLevel;
  signalsPosted: number;
  rewardsReceived: number;      // total OP received
  accuracy: number;             // 0–100 %
  joinedAt: number;             // timestamp
  badges: BadgeId[];
}

export type BadgeId =
  | 'FIRST_SIGNAL'
  | 'SIGNAL_10'
  | 'SIGNAL_50'
  | 'SIGNAL_100'
  | 'REWARDED_FIRST'
  | 'TOP_SUPPORTER'
  | 'HIGH_ACCURACY'
  | 'CRITICAL_FINDER'
  | 'ORACLE_RANK'
  | 'STREAK_7';

export interface Badge {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'legendary';
}

// ── Level thresholds ─────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS: Record<ReputationLevel, number> = {
  Explorer:  0,
  Operator:  300,
  Guardian:  900,
  Oracle:    2500,
};

export function getReputationLevel(score: number): ReputationLevel {
  if (score >= 2500) return 'Oracle';
  if (score >= 900)  return 'Guardian';
  if (score >= 300)  return 'Operator';
  return 'Explorer';
}

export function getLevelColor(level: ReputationLevel): string {
  const colors: Record<ReputationLevel, string> = {
    Explorer: '#a78bfa',
    Operator: '#00e5ff',
    Guardian: '#fbbf24',
    Oracle:   '#ff6d00',
  };
  return colors[level];
}

export function getLevelIcon(level: ReputationLevel): string {
  const icons: Record<ReputationLevel, string> = {
    Explorer: '🔍',
    Operator: '⚙',
    Guardian: '🛡',
    Oracle:   '🔮',
  };
  return icons[level];
}

export function getNextLevelThreshold(score: number): { current: number; next: number; level: ReputationLevel } {
  const level = getReputationLevel(score);
  const levels: ReputationLevel[] = ['Explorer', 'Operator', 'Guardian', 'Oracle'];
  const idx = levels.indexOf(level);
  const nextLevel = levels[idx + 1];
  return {
    current: LEVEL_THRESHOLDS[level],
    next: nextLevel ? LEVEL_THRESHOLDS[nextLevel] : LEVEL_THRESHOLDS.Oracle,
    level,
  };
}

// ── Score formula ────────────────────────────────────────────────────────────
// +20 per signal posted
// +15 per OP received in rewards
// +50 per popular signal (>5 rewards)
// -10 per ignored signal (0 rewards after 30 min — simulated via low multiplier)
export function computeReputationScore(
  signalsPosted: number,
  rewardsReceivedOP: number,
  popularSignals: number,
  accuracy: number,
): number {
  const base = signalsPosted * 20 + rewardsReceivedOP * 15 + popularSignals * 50;
  const accuracyBonus = Math.floor((accuracy - 50) * 3);
  return Math.max(0, Math.round(base + accuracyBonus));
}

// ── Badge catalog ────────────────────────────────────────────────────────────
export const BADGE_CATALOG: Record<BadgeId, Badge> = {
  FIRST_SIGNAL:   { id: 'FIRST_SIGNAL',   label: 'First Signal',    description: 'Posted your first signal',              icon: '📡', color: '#a78bfa', rarity: 'bronze'    },
  SIGNAL_10:      { id: 'SIGNAL_10',      label: '10 Signals',      description: 'Posted 10 signals',                     icon: '⚡', color: '#00e5ff', rarity: 'bronze'    },
  SIGNAL_50:      { id: 'SIGNAL_50',      label: '50 Signals',      description: 'Posted 50 signals',                     icon: '🗡', color: '#fbbf24', rarity: 'silver'    },
  SIGNAL_100:     { id: 'SIGNAL_100',     label: '100 Signals',     description: 'Posted 100 signals',                    icon: '👑', color: '#ff6d00', rarity: 'gold'      },
  REWARDED_FIRST: { id: 'REWARDED_FIRST', label: 'First Reward',    description: 'Received your first OP reward',         icon: '💎', color: '#00e676', rarity: 'bronze'    },
  TOP_SUPPORTER:  { id: 'TOP_SUPPORTER',  label: 'Top Supporter',   description: 'Appeared as a top supporter',           icon: '🔥', color: '#fbbf24', rarity: 'silver'    },
  HIGH_ACCURACY:  { id: 'HIGH_ACCURACY',  label: 'High Accuracy',   description: 'Signal accuracy above 80%',             icon: '🎯', color: '#00e5ff', rarity: 'silver'    },
  CRITICAL_FINDER:{ id: 'CRITICAL_FINDER',label: 'Critical Finder', description: 'Detected a CRITICAL severity signal',   icon: '🔴', color: '#ff1744', rarity: 'gold'      },
  ORACLE_RANK:    { id: 'ORACLE_RANK',    label: 'Oracle',          description: 'Reached Oracle reputation level',       icon: '🔮', color: '#ff6d00', rarity: 'legendary' },
  STREAK_7:       { id: 'STREAK_7',       label: '7-Day Streak',    description: 'Posted signals 7 days in a row',        icon: '🏆', color: '#c087f5', rarity: 'gold'      },
};

export const RARITY_COLORS: Record<string, string> = {
  bronze:    '#cd7f32',
  silver:    '#c0c0c0',
  gold:      '#fbbf24',
  legendary: '#ff6d00',
};

// ── Compute badges from stats ─────────────────────────────────────────────────
export function computeBadges(
  signalsPosted: number,
  rewardsReceived: number,
  accuracy: number,
  hasCritical: boolean,
  isTopSupporter: boolean,
  level: ReputationLevel,
): BadgeId[] {
  const badges: BadgeId[] = [];
  if (signalsPosted >= 1)   badges.push('FIRST_SIGNAL');
  if (signalsPosted >= 10)  badges.push('SIGNAL_10');
  if (signalsPosted >= 50)  badges.push('SIGNAL_50');
  if (signalsPosted >= 100) badges.push('SIGNAL_100');
  if (rewardsReceived >= 1) badges.push('REWARDED_FIRST');
  if (isTopSupporter)       badges.push('TOP_SUPPORTER');
  if (accuracy >= 80)       badges.push('HIGH_ACCURACY');
  if (hasCritical)          badges.push('CRITICAL_FINDER');
  if (level === 'Oracle')   badges.push('ORACLE_RANK');
  return badges;
}

// ── Load / save contributor profile ─────────────────────────────────────────
const PROFILE_KEY = (addr: string) => `opsignal_profile_${addr}`;

export function loadContributorProfile(walletAddress: string): ContributorProfile {
  if (typeof window === 'undefined') return makeDefaultProfile(walletAddress);

  const raw = localStorage.getItem(PROFILE_KEY(walletAddress));
  if (raw) {
    try {
      return JSON.parse(raw) as ContributorProfile;
    } catch {
      return makeDefaultProfile(walletAddress);
    }
  }
  return makeDefaultProfile(walletAddress);
}

export function saveContributorProfile(profile: ContributorProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY(profile.address), JSON.stringify(profile));
}

export function updateProfileOnSignal(
  walletAddress: string,
  hasCritical: boolean = false,
): ContributorProfile {
  const profile = loadContributorProfile(walletAddress);
  const updated: ContributorProfile = {
    ...profile,
    signalsPosted: profile.signalsPosted + 1,
    accuracy: Math.min(99, profile.accuracy + (Math.random() > 0.3 ? 0.8 : -0.4)),
  };
  updated.reputationScore = computeReputationScore(
    updated.signalsPosted,
    updated.rewardsReceived,
    Math.floor(updated.signalsPosted * 0.15),
    updated.accuracy,
  );
  updated.level = getReputationLevel(updated.reputationScore);
  updated.badges = computeBadges(
    updated.signalsPosted,
    updated.rewardsReceived,
    updated.accuracy,
    hasCritical || updated.badges.includes('CRITICAL_FINDER'),
    updated.badges.includes('TOP_SUPPORTER'),
    updated.level,
  );
  saveContributorProfile(updated);
  return updated;
}

export function updateProfileOnReward(walletAddress: string, opAmount: number): ContributorProfile {
  const profile = loadContributorProfile(walletAddress);
  const updated: ContributorProfile = {
    ...profile,
    rewardsReceived: profile.rewardsReceived + opAmount,
  };
  updated.reputationScore = computeReputationScore(
    updated.signalsPosted,
    updated.rewardsReceived,
    Math.floor(updated.signalsPosted * 0.15),
    updated.accuracy,
  );
  updated.level = getReputationLevel(updated.reputationScore);
  updated.badges = computeBadges(
    updated.signalsPosted,
    updated.rewardsReceived,
    updated.accuracy,
    updated.badges.includes('CRITICAL_FINDER'),
    updated.badges.includes('TOP_SUPPORTER'),
    updated.level,
  );
  saveContributorProfile(updated);
  return updated;
}

function makeDefaultProfile(walletAddress: string): ContributorProfile {
  return {
    address: walletAddress,
    displayName: walletAddress.length > 12 ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : walletAddress,
    reputationScore: 0,
    level: 'Explorer',
    signalsPosted: 0,
    rewardsReceived: 0,
    accuracy: 50,
    joinedAt: Date.now(),
    badges: [],
  };
}

// ── Mock reputation leaderboard ───────────────────────────────────────────────
export interface RepLeaderEntry {
  rank: number;
  address: string;
  displayName: string;
  reputationScore: number;
  level: ReputationLevel;
  signalsPosted: number;
  rewardsReceived: number;
  accuracy: number;
  badges: BadgeId[];
}

export function getReputationLeaderboard(myProfile?: ContributorProfile): RepLeaderEntry[] {
  const mock: Omit<RepLeaderEntry, 'rank'>[] = [
    { address: '0xA1b2…C3d4', displayName: '0xA1b2…C3d4', reputationScore: 5820, level: 'Oracle',   signalsPosted: 241, rewardsReceived: 187, accuracy: 91, badges: ['SIGNAL_100','ORACLE_RANK','HIGH_ACCURACY','CRITICAL_FINDER','STREAK_7']  },
    { address: '0xE5f6…G7h8', displayName: '0xE5f6…G7h8', reputationScore: 4310, level: 'Oracle',   signalsPosted: 178, rewardsReceived: 142, accuracy: 88, badges: ['SIGNAL_100','ORACLE_RANK','HIGH_ACCURACY','CRITICAL_FINDER']  },
    { address: '0xI9j0…K1l2', displayName: '0xI9j0…K1l2', reputationScore: 2980, level: 'Guardian', signalsPosted: 134, rewardsReceived: 98,  accuracy: 84, badges: ['SIGNAL_100','HIGH_ACCURACY','CRITICAL_FINDER','STREAK_7'] },
    { address: '0xM3n4…O5p6', displayName: '0xM3n4…O5p6', reputationScore: 2140, level: 'Guardian', signalsPosted: 98,  rewardsReceived: 65,  accuracy: 81, badges: ['SIGNAL_50','HIGH_ACCURACY','CRITICAL_FINDER']  },
    { address: '0xQ7r8…S9t0', displayName: '0xQ7r8…S9t0', reputationScore: 1560, level: 'Guardian', signalsPosted: 67,  rewardsReceived: 44,  accuracy: 77, badges: ['SIGNAL_50','REWARDED_FIRST','CRITICAL_FINDER']   },
    { address: '0xU1v2…W3x4', displayName: '0xU1v2…W3x4', reputationScore:  890, level: 'Operator', signalsPosted: 44,  rewardsReceived: 28,  accuracy: 72, badges: ['SIGNAL_10','REWARDED_FIRST','STREAK_7']  },
    { address: '0xY5z6…A7b8', displayName: '0xY5z6…A7b8', reputationScore:  540, level: 'Operator', signalsPosted: 28,  rewardsReceived: 15,  accuracy: 68, badges: ['SIGNAL_10','REWARDED_FIRST']  },
    { address: '0xC9d0…E1f2', displayName: '0xC9d0…E1f2', reputationScore:  310, level: 'Operator', signalsPosted: 14,  rewardsReceived: 7,   accuracy: 63, badges: ['SIGNAL_10','FIRST_SIGNAL']  },
  ];

  let entries = [...mock];

  if (myProfile && myProfile.reputationScore > 0) {
    const insertAt = entries.findIndex(e => e.reputationScore < myProfile.reputationScore);
    const pos = insertAt === -1 ? entries.length : insertAt;
    entries.splice(pos, 0, {
      address: myProfile.address,
      displayName: myProfile.displayName,
      reputationScore: myProfile.reputationScore,
      level: myProfile.level,
      signalsPosted: myProfile.signalsPosted,
      rewardsReceived: myProfile.rewardsReceived,
      accuracy: Math.round(myProfile.accuracy),
      badges: myProfile.badges,
    });
  }

  return entries.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }));
}
