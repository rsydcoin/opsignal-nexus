export interface ArenaSignal {
  id: string;
  challenger: string;
  token: string;
  targetMultiplier: number;
  confidence: number;
  stake: number;
  status: 'OPEN' | 'CHALLENGED' | 'RESOLVED';
  result?: 'WIN' | 'LOSE';
  xpPool: number;
  timestamp: number;
}

export interface ArenaChallenge {
  signalId: string;
  challenger: string;
  counter: number; // counter-prediction multiplier
  stake: number;
}

export interface ArenaResult {
  winner: string;
  xpGained: number;
  outcome: string;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateArenaSignals(count: number = 8): ArenaSignal[] {
  const tokens = ['OPETH', 'OPBTC', 'WBTC', 'USDT', 'NEXUS', 'RUNE', 'ARCANE', 'CIPHER'];
  const wallets = [
    '0x1a2b...3c4d', '0x5e6f...7a8b', '0x9c0d...1e2f',
    '0x3a4b...5c6d', '0x7e8f...9a0b', '0xab12...cd34',
    '0xef56...gh78', '0xij90...kl12',
  ];

  return Array.from({ length: count }, (_, i) => {
    const seed = `arena_${i}_${Date.now().toString().slice(0, -5)}`;
    const h = hashString(seed);
    const token = tokens[h % tokens.length];
    const wallet = wallets[(h + i) % wallets.length];

    return {
      id: `signal_${i}_${Date.now()}`,
      challenger: wallet,
      token,
      targetMultiplier: parseFloat((1.2 + (h % 50) / 10).toFixed(1)),
      confidence: 40 + (h % 50),
      stake: [100, 250, 500, 1000, 2500][h % 5],
      status: i < 5 ? 'OPEN' : 'CHALLENGED',
      xpPool: 50 + (h % 100),
      timestamp: Date.now() - i * 3600000,
    };
  });
}

export function resolveArenaChallenge(signal: ArenaSignal, challengerAddress: string): ArenaResult {
  const seed = `${signal.id}${challengerAddress}`;
  const h = hashString(seed);
  const roll = (h % 1000) / 1000;

  const winProbability = (signal.confidence / 100) * 0.7;
  const originalWins = roll < winProbability;

  const winner = originalWins ? signal.challenger : challengerAddress;
  const xpGained = signal.xpPool + Math.floor(signal.stake / 50);

  return {
    winner,
    xpGained,
    outcome: originalWins
      ? `${signal.token} signal proved true — original poster wins!`
      : `Signal failed — challenger claims the XP pool!`,
  };
}
