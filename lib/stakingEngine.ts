export interface StakeInput {
  amount: number;
  duration: number; // days
  autoCompound: boolean;
}

export interface StakeResult {
  apr: number;
  timeMultiplier: number;
  autoCompoundBonus: number;
  projectedReward: number;
  projectedTotal: number;
  xpReward: number;
  dailyReward: number;
}

function deterministicAPR(amount: number, duration: number): number {
  const base = 12 + (Math.sin(amount * 0.001) * 8);
  const durationBonus = Math.min(duration / 365 * 5, 5);
  return parseFloat((base + durationBonus).toFixed(2));
}

export function calculateStake(input: StakeInput): StakeResult {
  const apr = deterministicAPR(input.amount, input.duration);
  const timeMultiplier = parseFloat((1 + Math.min(input.duration / 365, 2) * 0.5).toFixed(3));
  const autoCompoundBonus = input.autoCompound ? 1.08 : 1.0;

  const baseReward = input.amount * (apr / 100) * (input.duration / 365);
  const projectedReward = parseFloat((baseReward * timeMultiplier * autoCompoundBonus).toFixed(4));
  const projectedTotal = parseFloat((input.amount + projectedReward).toFixed(4));
  const dailyReward = parseFloat((projectedReward / input.duration).toFixed(6));

  const xpReward = Math.floor(
    (input.amount / 100) * timeMultiplier * (input.autoCompound ? 1.5 : 1) + 10
  );

  return {
    apr,
    timeMultiplier,
    autoCompoundBonus: parseFloat((autoCompoundBonus - 1).toFixed(2)),
    projectedReward,
    projectedTotal,
    xpReward,
    dailyReward,
  };
}

export interface VaultOption {
  name: string;
  protocol: string;
  apr: number;
  tvl: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  token: string;
}

export const VAULT_OPTIONS: VaultOption[] = [
  { name: 'Arcane Yield Vault', protocol: 'OptiSwap', apr: 14.2, tvl: '$42.1M', risk: 'LOW', token: 'OPETH' },
  { name: 'Shadow Liquidity Pool', protocol: 'NexusFi', apr: 28.7, tvl: '$18.3M', risk: 'MEDIUM', token: 'OPBTC' },
  { name: 'Void Amplifier Vault', protocol: 'DarkYield', apr: 67.4, tvl: '$5.8M', risk: 'HIGH', token: 'OPUSDC' },
  { name: 'Crystal Staking Shrine', protocol: 'RuneStake', apr: 10.1, tvl: '$88.4M', risk: 'LOW', token: 'WBTC' },
  { name: 'Phantom Leverage Pool', protocol: 'GhostFi', apr: 145.2, tvl: '$2.1M', risk: 'HIGH', token: 'OPETH' },
];
