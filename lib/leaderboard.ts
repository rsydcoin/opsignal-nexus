export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  level: number;
  xp: number;
  winrate: number;
  wins: number;
  badge?: 'gold' | 'silver' | 'bronze';
}

const MOCK_PLAYERS: Omit<LeaderboardEntry, 'rank' | 'badge'>[] = [
  { wallet: '0xArc...9f2a', level: 12, xp: 14400, winrate: 78.5, wins: 134 },
  { wallet: '0xRune...7c18', level: 10, xp: 10000, winrate: 71.2, wins: 89 },
  { wallet: '0xCiph...3d44', level: 9, xp: 8100, winrate: 68.9, wins: 76 },
  { wallet: '0xVoid...6b21', level: 8, xp: 6400, winrate: 63.4, wins: 61 },
  { wallet: '0xNexu...1a55', level: 7, xp: 4900, winrate: 59.1, wins: 48 },
  { wallet: '0xSign...8e33', level: 6, xp: 3600, winrate: 55.7, wins: 39 },
  { wallet: '0xOrac...4f77', level: 5, xp: 2500, winrate: 52.3, wins: 31 },
  { wallet: '0xPhnt...2c90', level: 4, xp: 1600, winrate: 48.8, wins: 22 },
  { wallet: '0xBlad...5d14', level: 3, xp: 900, winrate: 45.1, wins: 16 },
  { wallet: '0xStar...0b66', level: 2, xp: 400, winrate: 40.0, wins: 10 },
];

export function getLeaderboard(playerEntry?: LeaderboardEntry): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = MOCK_PLAYERS.map((p, i) => ({
    ...p,
    rank: i + 1,
    badge: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : undefined,
  }));

  if (playerEntry && !entries.find(e => e.wallet === playerEntry.wallet)) {
    const insertIdx = entries.findIndex(e => e.xp < playerEntry.xp);
    const position = insertIdx === -1 ? entries.length : insertIdx;
    entries.splice(position, 0, playerEntry);
    entries.forEach((e, i) => {
      e.rank = i + 1;
      e.badge = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : undefined;
    });
  }

  return entries.slice(0, 12);
}
