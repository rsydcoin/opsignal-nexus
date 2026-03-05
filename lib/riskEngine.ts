export interface VaultMetrics {
  vaultName: string;
  apy: number;
  liquidity: number; // millions
  whaleConcentration: number; // 0-100
  stabilityScore: number; // 0-100
  riskIndex: number; // 0-100
  tvl: number;
  volume24h: number;
  priceImpact: number;
  auditScore: number;
}

export interface RadarDataPoint {
  metric: string;
  value: number;
  fullMark: number;
}

function pseudoRandom(seed: string, index: number): number {
  let h = 0;
  const str = seed + index.toString();
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h % 1000) / 1000;
}

export function scanVault(vaultAddress: string): VaultMetrics {
  const seed = vaultAddress + Date.now().toString().slice(0, -4);

  const apy = parseFloat((pseudoRandom(seed, 0) * 200 + 5).toFixed(2));
  const liquidity = parseFloat((pseudoRandom(seed, 1) * 50 + 0.5).toFixed(2));
  const whaleConcentration = parseFloat((pseudoRandom(seed, 2) * 80 + 10).toFixed(1));
  const stabilityScore = parseFloat((pseudoRandom(seed, 3) * 60 + 20).toFixed(1));
  const tvl = parseFloat((pseudoRandom(seed, 4) * 100 + 1).toFixed(2));
  const volume24h = parseFloat((pseudoRandom(seed, 5) * tvl * 0.3).toFixed(2));
  const priceImpact = parseFloat((pseudoRandom(seed, 6) * 5).toFixed(2));
  const auditScore = parseFloat((pseudoRandom(seed, 7) * 50 + 40).toFixed(1));

  // Risk index formula
  const apyRisk = Math.min(apy / 200, 1) * 25;
  const whaleRisk = (whaleConcentration / 100) * 30;
  const stabilityRisk = ((100 - stabilityScore) / 100) * 25;
  const liquidityRisk = Math.max(0, (10 - liquidity) / 10) * 20;
  const riskIndex = parseFloat(Math.min(apyRisk + whaleRisk + stabilityRisk + liquidityRisk, 100).toFixed(1));

  return {
    vaultName: vaultAddress || 'Unknown Vault',
    apy,
    liquidity,
    whaleConcentration,
    stabilityScore,
    riskIndex,
    tvl,
    volume24h,
    priceImpact,
    auditScore,
  };
}

export function generateRadarData(metrics: VaultMetrics): RadarDataPoint[] {
  return [
    { metric: 'Stability', value: metrics.stabilityScore, fullMark: 100 },
    { metric: 'Liquidity', value: Math.min(metrics.liquidity * 2, 100), fullMark: 100 },
    { metric: 'Safety', value: 100 - metrics.whaleConcentration, fullMark: 100 },
    { metric: 'Audit', value: metrics.auditScore, fullMark: 100 },
    { metric: 'Volume', value: Math.min((metrics.volume24h / metrics.tvl) * 100, 100), fullMark: 100 },
    { metric: 'APY Score', value: Math.min(metrics.apy / 2, 100), fullMark: 100 },
  ];
}

export function getRiskLevel(riskIndex: number): { label: string; color: string } {
  if (riskIndex < 25) return { label: 'SAFE', color: '#00e676' };
  if (riskIndex < 50) return { label: 'MODERATE', color: '#fbbf24' };
  if (riskIndex < 75) return { label: 'DANGEROUS', color: '#ff6d00' };
  return { label: 'CRITICAL', color: '#ff1744' };
}

export function generateAIInsights(metrics: VaultMetrics): string[] {
  const insights: string[] = [];

  if (metrics.whaleConcentration > 60) {
    insights.push(`⚠ High whale concentration detected (${metrics.whaleConcentration.toFixed(1)}%). Exit risk elevated.`);
  }
  if (metrics.apy > 100) {
    insights.push(`⚡ APY anomaly detected (${metrics.apy.toFixed(1)}%). Unsustainable yield patterns observed.`);
  }
  if (metrics.liquidity < 5) {
    insights.push(`💧 Vault liquidity unstable. Only $${metrics.liquidity.toFixed(2)}M TVL — thin markets ahead.`);
  }
  if (metrics.stabilityScore < 40) {
    insights.push(`🌀 Stability runes fractured. Price volatility predicted to surge.`);
  }
  if (metrics.auditScore > 80) {
    insights.push(`✅ Audit sigils verified. Contract integrity holds strong.`);
  }
  if (metrics.priceImpact > 3) {
    insights.push(`📊 Price impact too high (${metrics.priceImpact.toFixed(2)}%). Large trades will suffer slippage.`);
  }
  if (insights.length === 0) {
    insights.push(`🔮 Vault energies stable. Oracle readings nominal across all runes.`);
  }

  return insights;
}
