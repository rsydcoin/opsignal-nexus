// AI Signal Analyzer
// Deterministic logic that simulates AI-powered signal insights
// No external API — all output is computed from signal properties

import { SignalType, SignalSeverity } from './signalEngine';

export interface AIAnalysis {
  signalId: string;
  confidenceScore: number;       // 0–100
  insight: string;               // primary insight
  patternNote: string;           // historical pattern context
  riskVector: string;            // what is at risk
  recommendation: string;        // what to do
  anomalyFrequency: number;      // how many times in last 24h (simulated)
  similarSignals: number;        // similar signals in window
  falsePositiveRisk: number;     // 0–100
  processingMs: number;          // simulated processing time
}

export type SignalRarity = 'COMMON' | 'RARE' | 'CRITICAL';

// ── Seeded deterministic hash ────────────────────────────────────────────────
function stableRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0;
  }
  return (h >>> 0) / 4294967296;
}

function sr(seed: string, offset: number): number {
  return stableRandom(seed + String(offset));
}

// ── Confidence scoring model ─────────────────────────────────────────────────
// Based on: severity, node id, signal type, and timestamp bucket
export function computeConfidenceScore(
  type: SignalType,
  severity: SignalSeverity,
  nodeId: string,
  timestamp: number,
): number {
  const seed = `${type}_${severity}_${nodeId}`;
  const timeBucket = Math.floor(timestamp / 30_000); // 30s buckets

  const severityBase: Record<SignalSeverity, number> = {
    LOW: 52,
    MEDIUM: 67,
    HIGH: 78,
    CRITICAL: 88,
  };

  const typeBoost: Record<SignalType, number> = {
    ANOMALY_DETECTED: 8,
    ORACLE_DEVIATION: 6,
    CONSENSUS_SHIFT:  5,
    LATENCY_SPIKE:    3,
    THROUGHPUT_DROP:  2,
    NODE_SYNC:        0,
  };

  const base = severityBase[severity] + typeBoost[type];
  const noise = (sr(seed, timeBucket) - 0.5) * 14;
  return Math.max(20, Math.min(98, Math.round(base + noise)));
}

// ── Rarity classification ────────────────────────────────────────────────────
export function classifyRarity(
  severity: SignalSeverity,
  confidenceScore: number,
): SignalRarity {
  if (severity === 'CRITICAL') return 'CRITICAL';
  if (severity === 'HIGH' || confidenceScore >= 80) return 'RARE';
  return 'COMMON';
}

// ── AI insight templates ─────────────────────────────────────────────────────
const INSIGHTS: Record<SignalType, string[]> = {
  LATENCY_SPIKE: [
    'Latency pattern correlates with cross-chain bridge saturation at 94% throughput.',
    'Node response time exceeds 2σ baseline — likely congestion cascade forming.',
    'Latency delta matches pre-incident signature recorded 6 blocks ago.',
    'TCP retransmission spike detected; RPC endpoint degradation probability: high.',
  ],
  THROUGHPUT_DROP: [
    'Throughput regression of ~18% aligns with validator rotation schedule.',
    'Mempool depth rising — gas pricing pressure reducing effective throughput.',
    'Block propagation delays detected across 3 peers; throughput impact imminent.',
    'L2 sequencer batch interval has increased — throughput drop is expected.',
  ],
  ANOMALY_DETECTED: [
    'State deviation exceeds 3σ threshold across 2 independent data sources.',
    'Anomaly fingerprint matches known exploit pattern #A-7 with 87% similarity.',
    'Multi-vector anomaly: latency + state drift occurring simultaneously.',
    'Anomaly cluster density rising — probability of cascade event: elevated.',
  ],
  NODE_SYNC: [
    'Node sync lag behind chain head by 4 blocks — likely network partition.',
    'Peer discovery rate dropped 40%; isolation risk for this node.',
    'Fork resolution in progress — sync will stabilize within ~30 blocks.',
    'Snapshot download stalled; full resync will be required.',
  ],
  CONSENSUS_SHIFT: [
    'Validator voting weight redistributed — 3 large validators changed stake.',
    'Proposal queue depth at 94th percentile; finality delays expected.',
    'Consensus algorithm detected conflicting pre-commits from 2 validators.',
    'Block finality time increased 2.4× over baseline — consensus instability.',
  ],
  ORACLE_DEVIATION: [
    'Price feed variance between 3 oracle sources exceeds 0.9% threshold.',
    'Stale price feed detected on secondary oracle — deviation window open.',
    'Oracle heartbeat missed × 2 — TWAP calculation may be compromised.',
    'Cross-oracle spread widening; arbitrage conditions forming in adjacent pool.',
  ],
};

const PATTERNS: Record<SignalType, string[]> = {
  LATENCY_SPIKE:    ['Previously appeared 4× in the last 24h during peak load windows.', 'Historically resolves within 3–8 minutes without intervention.'],
  THROUGHPUT_DROP:  ['This pattern recurs with 85% frequency before validator epochs.', 'Appeared 2× this week; both prior instances self-resolved within 12 min.'],
  ANOMALY_DETECTED: ['This anomaly class has a 23% escalation rate to CRITICAL tier.', 'First occurrence in 6h; similar pattern preceded incident #47 by 9 min.'],
  NODE_SYNC:        ['Node sync events are routine; 91% resolve without manual action.', 'This node has had 2 prior sync events this session — monitor closely.'],
  CONSENSUS_SHIFT:  ['Consensus shifts of this magnitude occur ~1.2× per hour network-wide.', 'Prior shifts at this severity led to 15-block finality delays.'],
  ORACLE_DEVIATION: ['Oracle deviations >0.8% have preceded liquidation events in 31% of cases.', 'Deviation window typically closes within 2 price feed updates.'],
};

const RISK_VECTORS: Record<SignalType, string> = {
  LATENCY_SPIKE:    'User-facing RPC endpoints, DEX order routing',
  THROUGHPUT_DROP:  'Transaction inclusion time, gas price efficiency',
  ANOMALY_DETECTED: 'Protocol state integrity, smart contract execution',
  NODE_SYNC:        'Data availability, query consistency',
  CONSENSUS_SHIFT:  'Block finality, cross-chain bridge security',
  ORACLE_DEVIATION: 'DeFi pricing, liquidation thresholds, AMM pools',
};

const RECOMMENDATIONS: Record<SignalSeverity, string[]> = {
  LOW:      ['Continue monitoring. No immediate action required.', 'Log and observe — escalate if frequency increases within 10 min.'],
  MEDIUM:   ['Flag for ops review. Consider alerting downstream consumers.', 'Increase polling frequency on affected node. Prepare rollback if needed.'],
  HIGH:     ['Immediate ops attention recommended. Pause non-critical operations.', 'Engage incident channel. Assess blast radius across dependent services.'],
  CRITICAL: ['Trigger incident response protocol NOW. All hands.', 'Isolate affected node. Activate backup RPC. Notify bridge operators.'],
};

// ── Main analysis function ───────────────────────────────────────────────────
export function analyzeSignal(signal: {
  id: string;
  type: SignalType;
  severity: SignalSeverity;
  nodeId: string;
  timestamp: number;
}): AIAnalysis {
  const seed = `${signal.id}_${signal.type}`;
  const r = (o: number) => sr(seed, o);

  const confidenceScore = computeConfidenceScore(
    signal.type, signal.severity, signal.nodeId, signal.timestamp
  );

  const insightIdx    = Math.floor(r(1) * INSIGHTS[signal.type].length);
  const patternIdx    = Math.floor(r(2) * PATTERNS[signal.type].length);
  const recIdx        = Math.floor(r(3) * RECOMMENDATIONS[signal.severity].length);

  const anomalyFreq   = Math.floor(1 + r(4) * 7);
  const similarSigs   = Math.floor(r(5) * 12);
  const falsePositive = Math.max(5, Math.min(45, Math.round(
    (signal.severity === 'CRITICAL' ? 8 : signal.severity === 'HIGH' ? 15 : 28) + (r(6) - 0.5) * 12
  )));
  const processingMs  = Math.floor(120 + r(7) * 380);

  return {
    signalId: signal.id,
    confidenceScore,
    insight: INSIGHTS[signal.type][insightIdx],
    patternNote: `AI Pattern: ${PATTERNS[signal.type][patternIdx]}`,
    riskVector: RISK_VECTORS[signal.type],
    recommendation: RECOMMENDATIONS[signal.severity][recIdx],
    anomalyFrequency: anomalyFreq,
    similarSignals: similarSigs,
    falsePositiveRisk: falsePositive,
    processingMs,
  };
}

// ── Confidence bar color ─────────────────────────────────────────────────────
export function confidenceColor(score: number): string {
  if (score >= 80) return '#00e676';
  if (score >= 60) return '#fbbf24';
  if (score >= 40) return '#fb923c';
  return '#ff1744';
}

// ── Rarity config ────────────────────────────────────────────────────────────
export const RARITY_CONFIG: Record<SignalRarity, {
  label: string; color: string; bg: string; glow: string; icon: string;
}> = {
  COMMON:   { label: 'COMMON',   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', glow: 'rgba(167,139,250,0.3)', icon: '◈' },
  RARE:     { label: 'RARE',     color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  glow: 'rgba(251,191,36,0.35)', icon: '◆' },
  CRITICAL: { label: 'CRITICAL', color: '#ff1744', bg: 'rgba(255,23,68,0.1)',    glow: 'rgba(255,23,68,0.45)',  icon: '⬟' },
};
