export interface PlayerState {
  walletAddress: string;
  xp: number;
  level: number;
  wins: number;
  losses: number;
  winrate: number;
  multiplier: number;
  questProgress: QuestProgress;
  artifacts: string[];
  lastLogin: number;
}

export interface QuestProgress {
  battlesWon: number;
  vaultsScanned: number;
  yieldsForged: number;
  dailyReset: number;
  completedToday: string[];
}

export const DEFAULT_PLAYER: PlayerState = {
  walletAddress: '',
  xp: 0,
  level: 0,
  wins: 0,
  losses: 0,
  winrate: 0,
  multiplier: 1.0,
  questProgress: {
    battlesWon: 0,
    vaultsScanned: 0,
    yieldsForged: 0,
    dailyReset: Date.now(),
    completedToday: [],
  },
  artifacts: [],
  lastLogin: Date.now(),
};

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100));
}

export function xpForNextLevel(level: number): number {
  return (level + 1) * (level + 1) * 100;
}

export function xpForCurrentLevel(level: number): number {
  return level * level * 100;
}

export function xpProgress(xp: number): { current: number; needed: number; level: number; percentage: number } {
  const level = calculateLevel(xp);
  const current = xp - xpForCurrentLevel(level);
  const needed = xpForNextLevel(level) - xpForCurrentLevel(level);
  const percentage = Math.min((current / needed) * 100, 100);
  return { current, needed, level, percentage };
}

export function addXP(player: PlayerState, amount: number): { newPlayer: PlayerState; leveledUp: boolean; oldLevel: number } {
  const oldLevel = player.level;
  const newXP = player.xp + amount;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > oldLevel;

  const newPlayer: PlayerState = {
    ...player,
    xp: newXP,
    level: newLevel,
    multiplier: parseFloat((1 + newLevel * 0.1).toFixed(2)),
  };

  return { newPlayer, leveledUp, oldLevel };
}

export function updateWinRate(player: PlayerState): PlayerState {
  const total = player.wins + player.losses;
  const winrate = total > 0 ? parseFloat(((player.wins / total) * 100).toFixed(1)) : 0;
  return { ...player, winrate };
}

export function savePlayerState(player: PlayerState): void {
  if (typeof window === 'undefined') return;
  const key = `opsignal_player_${player.walletAddress || 'guest'}`;
  localStorage.setItem(key, JSON.stringify(player));
}

export function loadPlayerState(walletAddress: string): PlayerState {
  if (typeof window === 'undefined') return { ...DEFAULT_PLAYER, walletAddress };
  const key = `opsignal_player_${walletAddress || 'guest'}`;
  const stored = localStorage.getItem(key);
  if (!stored) return { ...DEFAULT_PLAYER, walletAddress };
  try {
    const parsed = JSON.parse(stored);
    // Check daily quest reset
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (now - parsed.questProgress.dailyReset > oneDayMs) {
      parsed.questProgress = {
        ...parsed.questProgress,
        battlesWon: 0,
        vaultsScanned: 0,
        yieldsForged: 0,
        dailyReset: now,
        completedToday: [],
      };
    }
    return { ...DEFAULT_PLAYER, ...parsed, walletAddress };
  } catch {
    return { ...DEFAULT_PLAYER, walletAddress };
  }
}

export function getLevelTitle(level: number): string {
  const titles = [
    'Apprentice',
    'Signal Scout',
    'Rune Walker',
    'Cipher Knight',
    'Arcane Blade',
    'Void Sentinel',
    'Oracle Vanguard',
    'Nexus Champion',
    'Signal Sovereign',
    'Eternal Archon',
  ];
  return titles[Math.min(level, titles.length - 1)];
}
