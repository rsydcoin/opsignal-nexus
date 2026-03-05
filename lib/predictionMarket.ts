// Signal Prediction Market Engine
// Users stake OP tokens on whether a signal is VALID or FALSE.
// Pool distributes to correct predictors proportionally on resolution.

import { SignalType, SignalSeverity } from './signalEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PredictionSide   = 'VALID' | 'FALSE';
export type StakeAmount      = 1 | 5 | 10;
export type MarketStatus     = 'OPEN' | 'CLOSED' | 'RESOLVED';

export interface PredictionRecord {
  id:           string;
  signalId:     string;
  userAddress:  string;
  side:         PredictionSide;
  amount:       StakeAmount;
  timestamp:    number;
  txHash:       string;
  confirmed:    boolean;
}

export interface MarketState {
  signalId:     string;
  status:       MarketStatus;
  validStaked:  number;          // total OP backing VALID
  falseStaked:  number;          // total OP backing FALSE
  totalStaked:  number;
  validCount:   number;          // number of unique VALID predictors
  falseCount:   number;
  expiresAt:    number;          // unix ms — when betting closes
  outcome:      PredictionSide | null;
  resolvedAt:   number | null;
  signalType:   SignalType;
  severity:     SignalSeverity;
  nodeName:     string;
}

export interface UserMarketPosition {
  signalId:        string;
  side:            PredictionSide;
  amount:          StakeAmount;
  potentialPayout: number;
  status:          'pending' | 'won' | 'lost';
}

export interface ResolvedPayout {
  signalId:   string;
  outcome:    PredictionSide;
  userSide:   PredictionSide;
  staked:     number;
  payout:     number;          // 0 if lost
  profit:     number;          // payout - staked (negative if lost)
  won:        boolean;
}

export interface UserPredictionStats {
  address:           string;
  totalPredictions:  number;
  correctPredictions:number;
  accuracy:          number;   // 0–100
  totalStaked:       number;
  totalWon:          number;
  netProfit:         number;   // totalWon - totalStaked (on resolved markets)
  bestStreak:        number;
  currentStreak:     number;
  openPositions:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic helpers
// ─────────────────────────────────────────────────────────────────────────────

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0;
  }
  return h;
}

function stableFloat(seed: string): number {
  return (fnv1a(seed) >>> 0) / 4294967296;
}

function makeTxHash(seed: string): string {
  const a = fnv1a(seed).toString(16).padStart(8, '0');
  const b = fnv1a(seed + '_b').toString(16).padStart(8, '0');
  const c = fnv1a(seed + '_c').toString(16).padStart(8, '0');
  const d = fnv1a(seed + '_d').toString(16).padStart(8, '0');
  return `0x${a}${b}${c}${d}${Date.now().toString(16)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution oracle — deterministically decides signal truth from its metadata
// ─────────────────────────────────────────────────────────────────────────────

export function computeSignalTruth(
  signalId: string,
  type: SignalType,
  severity: SignalSeverity,
): PredictionSide {
  // Weights that bias toward VALID for serious signals
  const sevWeight: Record<SignalSeverity, number> = {
    CRITICAL: 0.88,
    HIGH:     0.74,
    MEDIUM:   0.58,
    LOW:      0.42,
  };
  const typeWeight: Record<SignalType, number> = {
    ANOMALY_DETECTED: 0.12,
    ORACLE_DEVIATION: 0.08,
    CONSENSUS_SHIFT:  0.10,
    LATENCY_SPIKE:    0.04,
    THROUGHPUT_DROP:  0.06,
    NODE_SYNC:       -0.08,  // negative = more likely FALSE
  };

  const base = sevWeight[severity] + typeWeight[type];
  const noise = (stableFloat(signalId + '_truth') - 0.5) * 0.18;
  return (base + noise) > 0.5 ? 'VALID' : 'FALSE';
}

// Market window: signals expire 5 minutes after their creation timestamp
const MARKET_WINDOW_MS = 5 * 60 * 1000;

export function computeExpiresAt(signalTimestamp: number): number {
  return signalTimestamp + MARKET_WINDOW_MS;
}

export function computeMarketStatus(expiresAt: number, resolved: boolean): MarketStatus {
  if (resolved)                   return 'RESOLVED';
  if (Date.now() >= expiresAt)    return 'CLOSED';
  return 'OPEN';
}

export function msUntilExpiry(expiresAt: number): number {
  return Math.max(0, expiresAt - Date.now());
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'CLOSED';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${String(rem).padStart(2, '0')}s` : `${rem}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payout calculation
// ─────────────────────────────────────────────────────────────────────────────

export function computePotentialPayout(
  userStake: number,
  userSide: PredictionSide,
  market: Pick<MarketState, 'validStaked' | 'falseStaked' | 'totalStaked'>,
): number {
  const sideTotal = userSide === 'VALID' ? market.validStaked : market.falseStaked;
  if (sideTotal === 0) return userStake * 2; // no competition yet
  const share = userStake / sideTotal;
  return parseFloat((share * market.totalStaked).toFixed(2));
}

export function computePayout(record: PredictionRecord, market: MarketState): ResolvedPayout {
  if (!market.outcome) throw new Error('Market not resolved');
  const won = record.side === market.outcome;
  const sideTotal = record.side === 'VALID' ? market.validStaked : market.falseStaked;
  const share  = sideTotal > 0 ? record.amount / sideTotal : 0;
  const payout = won ? parseFloat((share * market.totalStaked).toFixed(2)) : 0;
  return {
    signalId:  record.signalId,
    outcome:   market.outcome,
    userSide:  record.side,
    staked:    record.amount,
    payout,
    profit:    parseFloat((payout - record.amount).toFixed(2)),
    won,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence keys
// ─────────────────────────────────────────────────────────────────────────────

const MARKET_KEY  = (id: string) => `opsig_mkt_${id}`;
const USER_KEY    = (addr: string) => `opsig_pred_user_${addr}`;
const STATS_KEY   = (addr: string) => `opsig_pred_stats_${addr}`;

// ─────────────────────────────────────────────────────────────────────────────
// Place a prediction
// ─────────────────────────────────────────────────────────────────────────────

export async function placePrediction(
  signalId:    string,
  side:        PredictionSide,
  amount:      StakeAmount,
  userAddress: string,
  signalType:  SignalType,
  severity:    SignalSeverity,
  nodeName:    string,
  signalTimestamp: number,
): Promise<{ record: PredictionRecord; market: MarketState }> {
  // Simulate wallet sign + broadcast
  await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

  const record: PredictionRecord = {
    id:          `pred_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    signalId,
    userAddress,
    side,
    amount,
    timestamp:   Date.now(),
    txHash:      makeTxHash(`${signalId}_${side}_${amount}_${userAddress}`),
    confirmed:   true,
  };

  if (typeof window === 'undefined') return { record, market: buildEmptyMarket(signalId, signalType, severity, nodeName, signalTimestamp) };

  // Load or create market state
  let market = loadMarketState(signalId) ??
    buildEmptyMarket(signalId, signalType, severity, nodeName, signalTimestamp);

  // Add stake
  if (side === 'VALID') {
    market.validStaked += amount;
    market.validCount  += 1;
  } else {
    market.falseStaked += amount;
    market.falseCount  += 1;
  }
  market.totalStaked += amount;

  // Persist market
  localStorage.setItem(MARKET_KEY(signalId), JSON.stringify(market));

  // Persist user prediction list
  const userPreds: PredictionRecord[] = JSON.parse(localStorage.getItem(USER_KEY(userAddress)) || '[]');
  userPreds.unshift(record);
  localStorage.setItem(USER_KEY(userAddress), JSON.stringify(userPreds.slice(0, 200)));

  return { record, market };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve a market (called once CLOSED status is detected)
// ─────────────────────────────────────────────────────────────────────────────

export function resolveMarket(signalId: string): MarketState | null {
  if (typeof window === 'undefined') return null;

  let market = loadMarketState(signalId);
  if (!market || market.status === 'RESOLVED') return market;

  const outcome = computeSignalTruth(signalId, market.signalType, market.severity);
  market.outcome     = outcome;
  market.status      = 'RESOLVED';
  market.resolvedAt  = Date.now();

  localStorage.setItem(MARKET_KEY(signalId), JSON.stringify(market));
  return market;
}

// ─────────────────────────────────────────────────────────────────────────────
// Load / query helpers
// ─────────────────────────────────────────────────────────────────────────────

export function loadMarketState(signalId: string): MarketState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(MARKET_KEY(signalId));
  if (!raw) return null;
  return JSON.parse(raw) as MarketState;
}

export function getUserPredictions(userAddress: string): PredictionRecord[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(USER_KEY(userAddress)) || '[]') as PredictionRecord[];
}

export function getUserPositionForSignal(signalId: string, userAddress: string): UserMarketPosition | null {
  const preds = getUserPredictions(userAddress);
  const record = preds.find(p => p.signalId === signalId);
  if (!record) return null;

  const market = loadMarketState(signalId);
  if (!market) return null;

  let status: UserMarketPosition['status'] = 'pending';
  let payout = computePotentialPayout(record.amount, record.side, market);

  if (market.status === 'RESOLVED' && market.outcome) {
    status = record.side === market.outcome ? 'won' : 'lost';
    payout = status === 'won' ? computePayout(record, market).payout : 0;
  }

  return { signalId, side: record.side, amount: record.amount, potentialPayout: payout, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// User stats
// ─────────────────────────────────────────────────────────────────────────────

export function computeUserStats(userAddress: string): UserPredictionStats {
  const preds = getUserPredictions(userAddress);
  let correct = 0, totalStaked = 0, totalWon = 0, bestStreak = 0, cur = 0, openPositions = 0;

  for (const p of preds) {
    const market = loadMarketState(p.signalId);
    if (!market) { openPositions++; continue; }

    totalStaked += p.amount;

    if (market.status === 'RESOLVED' && market.outcome) {
      const won = p.side === market.outcome;
      if (won) {
        correct++;
        const payout = computePayout(p, market).payout;
        totalWon += payout;
        cur++;
        bestStreak = Math.max(bestStreak, cur);
      } else {
        cur = 0;
      }
    } else {
      openPositions++;
    }
  }

  const resolved = preds.length - openPositions;
  const accuracy = resolved > 0 ? Math.round((correct / resolved) * 100) : 0;

  return {
    address:            userAddress,
    totalPredictions:   preds.length,
    correctPredictions: correct,
    accuracy,
    totalStaked,
    totalWon,
    netProfit:          parseFloat((totalWon - (totalStaked - openPositions * 0)).toFixed(2)),
    bestStreak,
    currentStreak:      cur,
    openPositions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Market factory helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildEmptyMarket(
  signalId: string,
  signalType: SignalType,
  severity: SignalSeverity,
  nodeName: string,
  signalTimestamp: number,
): MarketState {
  return {
    signalId,
    status:      'OPEN',
    validStaked: 0,
    falseStaked: 0,
    totalStaked: 0,
    validCount:  0,
    falseCount:  0,
    expiresAt:   computeExpiresAt(signalTimestamp),
    outcome:     null,
    resolvedAt:  null,
    signalType,
    severity,
    nodeName,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeded mock markets for /predictions demo page
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SIGNAL_TYPES: SignalType[] = [
  'ANOMALY_DETECTED', 'ORACLE_DEVIATION', 'LATENCY_SPIKE',
  'CONSENSUS_SHIFT',  'THROUGHPUT_DROP',  'NODE_SYNC',
];
const MOCK_SEVERITIES: SignalSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const MOCK_NODES = ['Node Alpha', 'Node Beta', 'Node Gamma', 'Node Delta'];

export interface SeedMarket extends MarketState {
  rank?: number;
}

export function seedDemoMarkets(count = 12): SeedMarket[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const seed      = `demo_market_${i}`;
    const r         = (o: number) => stableFloat(seed + String(o));
    const typeIdx   = Math.floor(r(0) * MOCK_SIGNAL_TYPES.length);
    const sevIdx    = Math.floor(r(1) * MOCK_SEVERITIES.length);
    const nodeIdx   = Math.floor(r(2) * MOCK_NODES.length);
    const type      = MOCK_SIGNAL_TYPES[typeIdx];
    const severity  = MOCK_SEVERITIES[sevIdx];
    const nodeName  = MOCK_NODES[nodeIdx];
    const signalId  = `demo_sig_${i}`;

    // Spread across: 5 open (future expiry), 7 resolved (past)
    const isResolved = i >= 5;
    const isOpen     = !isResolved;

    const expiresAt  = isOpen
      ? now + (1 + r(3) * 4) * 60_000          // 1–5 min from now
      : now - (2 + r(3) * 30) * 60_000;        // 2–32 min ago

    const validStaked = Math.floor(5 + r(4) * 55);
    const falseStaked = Math.floor(3 + r(5) * 35);
    const totalStaked = validStaked + falseStaked;

    const outcome: PredictionSide | null = isResolved
      ? computeSignalTruth(signalId, type, severity)
      : null;

    return {
      signalId,
      status:      isResolved ? 'RESOLVED' : 'OPEN',
      validStaked,
      falseStaked,
      totalStaked,
      validCount:  Math.floor(1 + r(6) * 8),
      falseCount:  Math.floor(1 + r(7) * 5),
      expiresAt,
      outcome,
      resolvedAt:  isResolved ? expiresAt + 100 : null,
      signalType:  type,
      severity,
      nodeName,
    } satisfies SeedMarket;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prediction leaderboard
// ─────────────────────────────────────────────────────────────────────────────

export interface PredictorEntry {
  rank:        number;
  address:     string;
  accuracy:    number;    // 0–100
  predictions: number;
  correct:     number;
  totalWon:    number;    // OP won
  netProfit:   number;
  streak:      number;
  isUser?:     boolean;
}

const MOCK_PREDICTORS: Omit<PredictorEntry, 'rank'>[] = [
  { address: '0xA1b2…C3d4', accuracy: 91, predictions: 148, correct: 135, totalWon: 842, netProfit: 412, streak: 14 },
  { address: '0xE5f6…G7h8', accuracy: 86, predictions: 112, correct:  96, totalWon: 620, netProfit: 290, streak:  9 },
  { address: '0xI9j0…K1l2', accuracy: 82, predictions:  87, correct:  71, totalWon: 430, netProfit: 180, streak:  7 },
  { address: '0xM3n4…O5p6', accuracy: 78, predictions:  66, correct:  51, totalWon: 310, netProfit: 110, streak:  5 },
  { address: '0xQ7r8…S9t0', accuracy: 74, predictions:  54, correct:  40, totalWon: 212, netProfit:  60, streak:  4 },
  { address: '0xU1v2…W3x4', accuracy: 70, predictions:  40, correct:  28, totalWon: 145, netProfit:  25, streak:  3 },
  { address: '0xY5z6…A7b8', accuracy: 65, predictions:  30, correct:  19, totalWon:  90, netProfit:   5, streak:  2 },
  { address: '0xC9d0…E1f2', accuracy: 61, predictions:  20, correct:  12, totalWon:  55, netProfit: -10, streak:  1 },
];

export function getPredictionLeaderboard(userStats?: UserPredictionStats): PredictorEntry[] {
  const list = [...MOCK_PREDICTORS];

  if (userStats && userStats.totalPredictions > 0) {
    const entry: Omit<PredictorEntry, 'rank'> = {
      address:     userStats.address,
      accuracy:    userStats.accuracy,
      predictions: userStats.totalPredictions,
      correct:     userStats.correctPredictions,
      totalWon:    userStats.totalWon,
      netProfit:   userStats.netProfit,
      streak:      userStats.currentStreak,
      isUser:      true,
    };
    const insertAt = list.findIndex(e => e.accuracy < entry.accuracy);
    list.splice(insertAt === -1 ? list.length : insertAt, 0, entry);
  }

  return list.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// XP rewarded for correct predictions
// ─────────────────────────────────────────────────────────────────────────────

export function xpForCorrectPrediction(stake: StakeAmount, odds: number): number {
  // odds = totalPool / winningSidePool  — higher odds = higher XP
  const base = stake === 1 ? 12 : stake === 5 ? 45 : 90;
  const multiplier = Math.min(3.0, Math.max(1.0, odds));
  return Math.round(base * multiplier);
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const STAKE_TIERS: { amount: StakeAmount; label: string; color: string; xpBase: number }[] = [
  { amount: 1,  label: '1 OP',  color: '#a78bfa', xpBase: 12 },
  { amount: 5,  label: '5 OP',  color: '#fbbf24', xpBase: 45 },
  { amount: 10, label: '10 OP', color: '#ff6d00', xpBase: 90 },
];

export const SIDE_CONFIG = {
  VALID: { label: 'VALID SIGNAL', color: '#00e676', bg: 'rgba(0,230,118,0.08)', icon: '✓', short: 'VALID' },
  FALSE: { label: 'FALSE SIGNAL', color: '#ff1744', bg: 'rgba(255,23,68,0.08)',  icon: '✗', short: 'FALSE' },
} as const;
