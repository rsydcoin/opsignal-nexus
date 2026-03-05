export interface BattleInput {
  tokenName: string;
  targetMultiplier: number;
  duration: number; // days
  confidence: number; // 0-100
  stakeAmount: number;
}

export interface BattleResult {
  riskScore: number;
  winProbability: number;
  outcome: 'WIN' | 'LOSE';
  xpReward: number;
  multiplierBonus: number;
  message: string;
  details: string;
}

// Deterministic seeded random using xorshift
function seededRandom(seed: number): number {
  let x = seed;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function getSeed(input: BattleInput): number {
  const str = `${input.tokenName}${input.targetMultiplier}${input.duration}${input.confidence}${input.stakeAmount}${Date.now()}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function calculateRiskScore(input: BattleInput): number {
  const multiplierRisk = Math.min((input.targetMultiplier - 1) / 10, 0.5);
  const durationRisk = Math.min(input.duration / 365, 0.3);
  const confidenceBuffer = (100 - input.confidence) / 200;
  const stakeRisk = Math.min(input.stakeAmount / 100000, 0.2);
  const risk = multiplierRisk + durationRisk + confidenceBuffer + stakeRisk;
  return parseFloat(Math.min(risk, 0.95).toFixed(3));
}

export function runBattle(input: BattleInput): BattleResult {
  const riskScore = calculateRiskScore(input);
  const confidenceNorm = input.confidence / 100;
  const winProbability = parseFloat((confidenceNorm * (1 - riskScore)).toFixed(3));

  const seed = getSeed(input);
  const roll = seededRandom(seed);

  const outcome: 'WIN' | 'LOSE' = roll < winProbability ? 'WIN' : 'LOSE';

  const baseXP = Math.floor(input.stakeAmount / 10) + 20;
  const xpReward = outcome === 'WIN'
    ? Math.floor(baseXP * (1 + winProbability))
    : Math.floor(baseXP * 0.3);

  const multiplierBonus = outcome === 'WIN'
    ? parseFloat((input.targetMultiplier * winProbability * 0.1).toFixed(2))
    : 0;

  const winMessages = [
    `${input.tokenName} surged ${(input.targetMultiplier * 100 - 100).toFixed(0)}% — signal confirmed!`,
    `The oracle's vision proved true. ${input.tokenName} hit target.`,
    `Victory! Your signal on ${input.tokenName} manifested.`,
    `Runes aligned — ${input.tokenName} broke resistance!`,
  ];

  const loseMessages = [
    `${input.tokenName} failed to manifest the signal. Market forces resisted.`,
    `The void consumed your prediction on ${input.tokenName}.`,
    `Risk shadows overwhelmed the signal. Better intel next time.`,
    `${input.tokenName} turned hostile — signal extinguished.`,
  ];

  const messages = outcome === 'WIN' ? winMessages : loseMessages;
  const msgIdx = Math.floor(seededRandom(seed + 1) * messages.length);

  return {
    riskScore,
    winProbability,
    outcome,
    xpReward,
    multiplierBonus,
    message: messages[msgIdx],
    details: `Risk Score: ${(riskScore * 100).toFixed(1)}% | Win Probability: ${(winProbability * 100).toFixed(1)}%`,
  };
}
