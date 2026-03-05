// Signal Reward System
// Handles OP token rewards for signals, persistence, and supporter tracking

import { SignalType, SignalSeverity } from './signalEngine';

export type RewardTier = 1 | 5 | 10;

export interface RewardRecord {
  id: string;
  signalId: string;
  from: string;              // wallet address (truncated)
  amount: RewardTier;
  timestamp: number;
  txHash: string;
  confirmed: boolean;
}

export interface SignalRewardSummary {
  signalId: string;
  totalOP: number;
  rewardCount: number;
  topSupporters: TopSupporter[];
  lastRewarded: number | null;
}

export interface TopSupporter {
  address: string;
  totalOP: number;
  rewardCount: number;
}

// ── Deterministic tx hash generator ─────────────────────────────────────────
function makeTxHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0;
  }
  return '0x' + h.toString(16).padStart(8, '0') +
    Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') +
    Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') +
    Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
}

// ── XP earned per reward ─────────────────────────────────────────────────────
export function xpForReward(amount: RewardTier): number {
  return amount === 1 ? 8 : amount === 5 ? 30 : 65;
}

// ── Simulate reward transaction ──────────────────────────────────────────────
export async function rewardSignal(
  signalId: string,
  amount: RewardTier,
  walletAddress: string,
): Promise<RewardRecord> {
  // Simulate wallet confirmation + broadcast delay
  await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

  const record: RewardRecord = {
    id: `rwd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    signalId,
    from: walletAddress,
    amount,
    timestamp: Date.now(),
    txHash: makeTxHash(`${signalId}_${amount}_${walletAddress}_${Date.now()}`),
    confirmed: true,
  };

  // Persist
  if (typeof window !== 'undefined') {
    const key = `opsignal_rewards_${signalId}`;
    const existing: RewardRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(record);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));

    // Track by wallet too
    const walletKey = `opsignal_sent_rewards_${walletAddress}`;
    const walletRewards: RewardRecord[] = JSON.parse(localStorage.getItem(walletKey) || '[]');
    walletRewards.unshift(record);
    localStorage.setItem(walletKey, JSON.stringify(walletRewards.slice(0, 200)));
  }

  return record;
}

// ── Load reward summary for a signal ─────────────────────────────────────────
export function getSignalRewards(signalId: string): SignalRewardSummary {
  let records: RewardRecord[] = [];

  if (typeof window !== 'undefined') {
    records = JSON.parse(localStorage.getItem(`opsignal_rewards_${signalId}`) || '[]');
  }

  const totalOP = records.reduce((s, r) => s + r.amount, 0);

  // Aggregate by sender
  const byAddress: Record<string, TopSupporter> = {};
  for (const r of records) {
    if (!byAddress[r.from]) byAddress[r.from] = { address: r.from, totalOP: 0, rewardCount: 0 };
    byAddress[r.from].totalOP += r.amount;
    byAddress[r.from].rewardCount += 1;
  }

  const topSupporters = Object.values(byAddress)
    .sort((a, b) => b.totalOP - a.totalOP)
    .slice(0, 3);

  return {
    signalId,
    totalOP,
    rewardCount: records.length,
    topSupporters,
    lastRewarded: records.length > 0 ? records[0].timestamp : null,
  };
}

// ── Seed mock rewards for display purposes (used in demo signals) ─────────────
export function seedMockRewards(signalId: string, baseOP: number, baseCount: number): SignalRewardSummary {
  const MOCK_WALLETS = ['0xA1b2…C3', '0xE5f6…D8', '0xI9j0…F2', '0xM3n4…B6', '0xQ7r8…K0'];
  const topSupporters: TopSupporter[] = MOCK_WALLETS.slice(0, 3).map((address, i) => ({
    address,
    totalOP: Math.max(1, Math.floor(baseOP * (0.5 - i * 0.12))),
    rewardCount: Math.max(1, baseCount - i * 2),
  }));

  return {
    signalId,
    totalOP: baseOP,
    rewardCount: baseCount,
    topSupporters,
    lastRewarded: Date.now() - Math.random() * 3600_000,
  };
}

// ── Total OP rewards sent by a wallet ────────────────────────────────────────
export function getWalletRewardStats(walletAddress: string): { totalSent: number; rewardCount: number } {
  if (typeof window === 'undefined') return { totalSent: 0, rewardCount: 0 };
  const records: RewardRecord[] = JSON.parse(
    localStorage.getItem(`opsignal_sent_rewards_${walletAddress}`) || '[]'
  );
  return {
    totalSent: records.reduce((s, r) => s + r.amount, 0),
    rewardCount: records.length,
  };
}

// ── Reward tiers with label ───────────────────────────────────────────────────
export const REWARD_TIERS: { amount: RewardTier; label: string; color: string }[] = [
  { amount: 1,  label: '1 OP',  color: '#a78bfa' },
  { amount: 5,  label: '5 OP',  color: '#fbbf24' },
  { amount: 10, label: '10 OP', color: '#ff6d00' },
];
