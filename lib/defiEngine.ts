/**
 * lib/defiEngine.ts
 * DeFi simulation engine for Opsignal Nexus.
 * Uses real market prices from lib/market.ts for all calculations.
 * Simulates OPNet contract interactions (stake/unstake/swap/claim).
 */

import type { CoinData } from './market';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StakingPosition {
  id: string;
  asset: string;           // "BTC" | "ETH" | "OP" | "USDT" etc.
  coinId: string;          // coingecko id for price lookup
  amountStaked: number;
  apr: number;
  stakedAt: number;        // timestamp ms
  claimedAt: number;       // timestamp ms of last claim
  poolName: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PortfolioSnapshot {
  walletAddress: string;
  btcBalance: number;        // simulated BTC balance
  ethBalance: number;
  opBalance: number;
  usdtBalance: number;
  stakingPositions: StakingPosition[];
  estimatedUsdValue: number; // computed from live prices
}

export interface SwapQuote {
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;      // toAmount per 1 fromAsset
  priceImpact: number;       // % e.g. 0.3
  fee: number;               // USD value
  route: string;             // e.g. "BTC → USDT via OPNet AMM"
  validFor: number;          // seconds
}

export interface StrategyInsight {
  id: string;
  title: string;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;        // 0–100
  suggestedAction: string;
  details: string;
  estimatedYield: number;    // % APR
  steps: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  xpReward: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Staking pool catalog
// ─────────────────────────────────────────────────────────────────────────────

export interface PoolOption {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  coinId: string;
  apr: number;
  tvlUsd: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  lockDays: number;
  description: string;
}

export const POOL_OPTIONS: PoolOption[] = [
  {
    id: 'opbtc-vault',
    name: 'BTC Rune Vault',
    protocol: 'OPNet AMM',
    asset: 'BTC',
    coinId: 'bitcoin',
    apr: 5.8,
    tvlUsd: 42_100_000,
    risk: 'LOW',
    lockDays: 0,
    description: 'Liquid BTC staking via OPNet rune protocol. No lock-up.',
  },
  {
    id: 'opbtc-lp',
    name: 'BTC/USDT Liquidity',
    protocol: 'OptiSwap',
    asset: 'BTC',
    coinId: 'bitcoin',
    apr: 14.2,
    tvlUsd: 18_300_000,
    risk: 'MEDIUM',
    lockDays: 7,
    description: 'Provide BTC/USDT liquidity. Earn trading fees + OP rewards.',
  },
  {
    id: 'op-staking',
    name: 'OP Signal Shrine',
    protocol: 'NexusFi',
    asset: 'OP',
    coinId: 'optimism',
    apr: 22.4,
    tvlUsd: 8_700_000,
    risk: 'MEDIUM',
    lockDays: 14,
    description: 'Stake OP tokens to earn signal intelligence XP + OP rewards.',
  },
  {
    id: 'usdt-vault',
    name: 'Stable Arcane Pool',
    protocol: 'RuneStake',
    asset: 'USDT',
    coinId: 'tether',
    apr: 6.1,
    tvlUsd: 88_400_000,
    risk: 'LOW',
    lockDays: 0,
    description: 'Stablecoin yield on USDT. Lowest risk, consistent returns.',
  },
  {
    id: 'eth-vault',
    name: 'ETH Phantom Pool',
    protocol: 'GhostFi',
    asset: 'ETH',
    coinId: 'ethereum',
    apr: 9.7,
    tvlUsd: 31_200_000,
    risk: 'MEDIUM',
    lockDays: 3,
    description: 'ETH liquid staking via cross-chain OPNet bridge.',
  },
  {
    id: 'btc-leverage',
    name: 'Void Amplifier',
    protocol: 'DarkYield',
    asset: 'BTC',
    coinId: 'bitcoin',
    apr: 67.4,
    tvlUsd: 2_100_000,
    risk: 'HIGH',
    lockDays: 30,
    description: 'Leveraged BTC yield farming. High reward, high liquidation risk.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Swappable assets
// ─────────────────────────────────────────────────────────────────────────────

export const SWAP_ASSETS = [
  { symbol: 'BTC',  coinId: 'bitcoin',    decimals: 8 },
  { symbol: 'ETH',  coinId: 'ethereum',   decimals: 18 },
  { symbol: 'OP',   coinId: 'optimism',   decimals: 18 },
  { symbol: 'USDT', coinId: 'tether',     decimals: 6 },
  { symbol: 'USDC', coinId: 'usd-coin',   decimals: 6 },
  { symbol: 'SOL',  coinId: 'solana',     decimals: 9 },
  { symbol: 'AVAX', coinId: 'avalanche-2',decimals: 18 },
  { symbol: 'BNB',  coinId: 'binancecoin',decimals: 18 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio simulation
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a deterministic fake balance from a wallet address. */
function addressToSeed(addr: string): number {
  let h = 0;
  for (let i = 0; i < addr.length; i++) {
    h = Math.imul(31, h) + addr.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function pseudoBalance(seed: number, index: number, max: number, min: number): number {
  let h = seed ^ (index * 2654435761);
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h);
  return parseFloat((min + (Math.abs(h) % 1000) / 1000 * (max - min)).toFixed(6));
}

export function buildPortfolio(
  walletAddress: string,
  marketData: CoinData[],
  savedPositions: StakingPosition[]
): PortfolioSnapshot {
  const seed = addressToSeed(walletAddress);
  const btcBalance  = pseudoBalance(seed, 1, 0.5,  0.005);
  const ethBalance  = pseudoBalance(seed, 2, 4.0,  0.1);
  const opBalance   = pseudoBalance(seed, 3, 500,  10);
  const usdtBalance = pseudoBalance(seed, 4, 5000, 100);

  const price = (id: string) => marketData.find(c => c.id === id)?.current_price ?? 0;
  const btcUsd  = price('bitcoin');
  const ethUsd  = price('ethereum');
  const opUsd   = price('optimism');

  const spotValue = btcBalance * btcUsd + ethBalance * ethUsd + opBalance * opUsd + usdtBalance;

  const stakingValue = savedPositions.reduce((sum, pos) => {
    const p = price(pos.coinId);
    return sum + pos.amountStaked * p;
  }, 0);

  return {
    walletAddress,
    btcBalance,
    ethBalance,
    opBalance,
    usdtBalance,
    stakingPositions: savedPositions,
    estimatedUsdValue: spotValue + stakingValue,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Swap quote engine
// ─────────────────────────────────────────────────────────────────────────────

export function getSwapQuote(
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
  marketData: CoinData[]
): SwapQuote | null {
  if (!fromAmount || fromAmount <= 0) return null;

  const priceOf = (sym: string): number => {
    const assetDef = SWAP_ASSETS.find(a => a.symbol === sym);
    if (!assetDef) return 0;
    // Stablecoins
    if (sym === 'USDT' || sym === 'USDC') return 1;
    return marketData.find(c => c.id === assetDef.coinId)?.current_price ?? 0;
  };

  const fromPrice = priceOf(fromSymbol);
  const toPrice   = priceOf(toSymbol);
  if (!fromPrice || !toPrice) return null;

  const fromUsd   = fromAmount * fromPrice;
  // Simulate 0.25% AMM fee + 0.05–0.4% price impact based on size
  const feeRate   = 0.0025;
  const impactPct = Math.min(0.4, fromUsd / 1_000_000 * 0.5 + 0.05);
  const fee       = fromUsd * feeRate;
  const toUsd     = fromUsd * (1 - feeRate) * (1 - impactPct / 100);
  const toAmount  = toUsd / toPrice;
  const rate      = toAmount / fromAmount;

  return {
    fromAsset: fromSymbol,
    toAsset:   toSymbol,
    fromAmount,
    toAmount:  parseFloat(toAmount.toFixed(8)),
    exchangeRate: parseFloat(rate.toFixed(8)),
    priceImpact:  parseFloat(impactPct.toFixed(3)),
    fee:          parseFloat(fee.toFixed(4)),
    route: `${fromSymbol} → ${toSymbol} via OPNet AMM`,
    validFor: 30,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Accrued rewards
// ─────────────────────────────────────────────────────────────────────────────

export function calcAccruedRewards(pos: StakingPosition, assetPrice: number): number {
  const ageMs   = Date.now() - pos.claimedAt;
  const ageDays = ageMs / 86_400_000;
  const annualRewardUsd = pos.amountStaked * assetPrice * (pos.apr / 100);
  return parseFloat((annualRewardUsd * ageDays / 365).toFixed(4));
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Insight Engine
// ─────────────────────────────────────────────────────────────────────────────

export function generateStrategies(
  marketData: CoinData[],
  portfolio: PortfolioSnapshot | null
): StrategyInsight[] {
  const btc  = marketData.find(c => c.id === 'bitcoin');
  const eth  = marketData.find(c => c.id === 'ethereum');
  const op   = marketData.find(c => c.id === 'optimism');

  if (!btc) return [];

  const btcChange  = btc.price_change_percentage_24h ?? 0;
  const ethChange  = eth?.price_change_percentage_24h ?? 0;
  const opChange   = op?.price_change_percentage_24h ?? 0;
  const btcPrice   = btc.current_price;

  const insights: StrategyInsight[] = [];

  // ── Strategy 1: BTC momentum ─────────────────────────────────────────────
  if (Math.abs(btcChange) > 3) {
    const isBull = btcChange > 0;
    insights.push({
      id: 'btc-momentum',
      title: `BTC ${isBull ? 'Bullish' : 'Bearish'} Momentum Detected`,
      signal: isBull ? 'BULLISH' : 'BEARISH',
      confidence: Math.min(95, 60 + Math.abs(btcChange) * 3),
      suggestedAction: isBull
        ? 'Hold BTC · Stake in BTC Rune Vault for yield'
        : 'Swap BTC → USDT · Stake Stable Pool',
      details: `BTC moved ${btcChange > 0 ? '+' : ''}${btcChange.toFixed(2)}% in 24h. ${
        isBull
          ? `Price at $${btcPrice.toLocaleString()}. Momentum favours accumulation and yield generation.`
          : `Downward signal detected. Rotating to stablecoins reduces drawdown risk.`
      }`,
      estimatedYield: isBull ? 5.8 : 6.1,
      steps: isBull
        ? ['Hold current BTC', 'Stake 50% in BTC Rune Vault (5.8% APR)', 'Collect rewards weekly']
        : ['Swap BTC → USDT at market price', 'Stake USDT in Stable Arcane Pool (6.1% APR)', 'Re-enter BTC when momentum reverses'],
      riskLevel: isBull ? 'LOW' : 'LOW',
      xpReward: 45,
    });
  }

  // ── Strategy 2: ETH vs BTC divergence ────────────────────────────────────
  if (eth && Math.abs(ethChange - btcChange) > 4) {
    const ethOutperforms = ethChange > btcChange;
    insights.push({
      id: 'eth-btc-divergence',
      title: `ETH/BTC Divergence Signal`,
      signal: ethOutperforms ? 'BULLISH' : 'NEUTRAL',
      confidence: Math.min(88, 55 + Math.abs(ethChange - btcChange) * 2),
      suggestedAction: ethOutperforms
        ? 'Swap BTC → ETH · Stake ETH Phantom Pool'
        : 'Swap ETH → BTC · Stake BTC Rune Vault',
      details: `ETH ${ethChange > 0 ? '+' : ''}${ethChange.toFixed(2)}% vs BTC ${btcChange > 0 ? '+' : ''}${btcChange.toFixed(2)}% over 24h. ${
        ethOutperforms ? 'ETH is outperforming — cross-asset rotation opportunity.' : 'BTC dominance increasing — rotate back to BTC base.'
      }`,
      estimatedYield: ethOutperforms ? 9.7 : 5.8,
      steps: ethOutperforms
        ? ['Swap 30% BTC → ETH via OPNet AMM', 'Stake ETH in ETH Phantom Pool (9.7% APR)', 'Monitor BTC dominance weekly']
        : ['Swap ETH → BTC', 'Stake BTC in BTC Rune Vault (5.8% APR)', 'Track ETH/BTC ratio'],
      riskLevel: 'MEDIUM',
      xpReward: 60,
    });
  }

  // ── Strategy 3: OP yield farming ─────────────────────────────────────────
  if (op) {
    const opBullish = opChange > 2;
    insights.push({
      id: 'op-yield',
      title: `OP Ecosystem Yield Opportunity`,
      signal: opBullish ? 'BULLISH' : 'NEUTRAL',
      confidence: opBullish ? 72 : 58,
      suggestedAction: 'Stake OP in Signal Shrine · Earn OP + XP rewards',
      details: `OP token ${opChange > 0 ? '+' : ''}${opChange.toFixed(2)}% today. OPNet native staking provides 22.4% APR with bonus XP rewards for Signal Knights.`,
      estimatedYield: 22.4,
      steps: ['Acquire OP tokens', 'Stake in OP Signal Shrine (22.4% APR)', 'Earn OP rewards + bonus Signal XP', 'Compound weekly for maximum yield'],
      riskLevel: 'MEDIUM',
      xpReward: 80,
    });
  }

  // ── Strategy 4: Stable yield (always shown) ───────────────────────────────
  if (Math.abs(btcChange) < 2) {
    insights.push({
      id: 'stable-harvest',
      title: 'Sideways Market — Stable Harvest Mode',
      signal: 'NEUTRAL',
      confidence: 81,
      suggestedAction: 'Deploy capital to Stable Arcane Pool',
      details: `BTC is ranging within ${btcChange.toFixed(2)}% daily change. Low-volatility environment is ideal for stable yield farming with zero impermanent loss risk.`,
      estimatedYield: 6.1,
      steps: ['Swap idle assets → USDT', 'Stake USDT in Stable Arcane Pool (6.1% APR)', 'Set weekly auto-claim', 'Re-assess when BTC moves >5%'],
      riskLevel: 'LOW',
      xpReward: 30,
    });
  }

  // ── Strategy 5: Portfolio-aware (if connected) ────────────────────────────
  if (portfolio && portfolio.btcBalance > 0.01) {
    const portfolioUsd = portfolio.estimatedUsdValue;
    const stakedPct    = portfolio.stakingPositions.reduce(
      (sum, p) => sum + p.amountStaked * (marketData.find(c => c.id === p.coinId)?.current_price ?? 0), 0
    ) / portfolioUsd * 100;

    if (stakedPct < 30) {
      insights.push({
        id: 'underweight-staking',
        title: 'Portfolio Under-Staked',
        signal: 'NEUTRAL',
        confidence: 90,
        suggestedAction: `Stake ${(30 - stakedPct).toFixed(0)}% more of portfolio for optimal yield`,
        details: `Only ${stakedPct.toFixed(1)}% of your $${portfolioUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} portfolio is earning yield. Optimal DeFi allocation is 30–60% staked.`,
        estimatedYield: 8.5,
        steps: [
          `Stake ${Math.round(portfolio.btcBalance * 0.3 * 1000) / 1000} BTC in BTC Rune Vault`,
          'Stake remaining USDT in Stable Pool',
          'Rebalance monthly based on signals',
        ],
        riskLevel: 'LOW',
        xpReward: 50,
      });
    }
  }

  return insights.slice(0, 4); // max 4 strategies
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage persistence for staking positions
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = (addr: string) => `opsig_stake_${addr}`;

export function loadPositions(walletAddress: string): StakingPosition[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(walletAddress)) || '[]');
  } catch { return []; }
}

export function savePositions(walletAddress: string, positions: StakingPosition[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY(walletAddress), JSON.stringify(positions));
}

export function addPosition(
  walletAddress: string,
  pool: PoolOption,
  amount: number
): StakingPosition {
  const pos: StakingPosition = {
    id:           `${pool.id}-${Date.now()}`,
    asset:        pool.asset,
    coinId:       pool.coinId,
    amountStaked: amount,
    apr:          pool.apr,
    stakedAt:     Date.now(),
    claimedAt:    Date.now(),
    poolName:     pool.name,
    risk:         pool.risk,
  };
  const existing = loadPositions(walletAddress);
  savePositions(walletAddress, [...existing, pos]);
  return pos;
}

export function removePosition(walletAddress: string, positionId: string): void {
  const existing = loadPositions(walletAddress);
  savePositions(walletAddress, existing.filter(p => p.id !== positionId));
}

export function claimPosition(walletAddress: string, positionId: string): void {
  const existing = loadPositions(walletAddress);
  savePositions(walletAddress, existing.map(p =>
    p.id === positionId ? { ...p, claimedAt: Date.now() } : p
  ));
}
