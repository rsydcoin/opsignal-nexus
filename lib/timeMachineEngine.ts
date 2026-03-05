import { AnomalyEvent, SignalType, SignalSeverity } from './signalEngine';

export type EventEra = 'PAST' | 'PRESENT' | 'PREDICTED';

export interface TimelineEvent {
  id: string;
  era: EventEra;
  type: SignalType;
  severity: SignalSeverity;
  nodeId: string;
  nodeName: string;
  timestamp: number;          // real ms timestamp
  offsetMinutes: number;      // negative = past, 0 = now, positive = future
  value: number;
  confidence?: number;        // only for PREDICTED events (0–100)
  predictionNotes?: string;
  resolved: boolean;
  txHash?: string;            // set if logged onchain
}

// --- deterministic seeding (same LCG as signalEngine) ---
function lcg(seed: number): number {
  return (((1664525 * seed + 1013904223) >>> 0)) / 4294967296;
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0;
  }
  return h;
}

const NODE_IDS   = ['alpha', 'beta', 'gamma', 'delta'];
const NODE_NAMES = ['Node Alpha', 'Node Beta', 'Node Gamma', 'Node Delta'];
const SIGNAL_TYPES: SignalType[] = [
  'LATENCY_SPIKE', 'THROUGHPUT_DROP', 'ANOMALY_DETECTED',
  'NODE_SYNC', 'CONSENSUS_SHIFT', 'ORACLE_DEVIATION',
];
const SEVERITIES: SignalSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEV_WEIGHTS = [0.38, 0.34, 0.20, 0.08];

const PREDICTION_NOTES: Record<SignalType, string[]> = {
  LATENCY_SPIKE: [
    'Oracle models detect cross-chain bridge congestion building.',
    'Historical pattern matches pre-spike signature at 94% correlation.',
    'Node load trending toward threshold — spike window: 3–8 min.',
  ],
  THROUGHPUT_DROP: [
    'Liquidity drain pattern detected in adjacent mempool.',
    'Validator rotation scheduled — expect 12–18% throughput reduction.',
    'Gas estimation variance rising. Throughput degradation likely.',
  ],
  ANOMALY_DETECTED: [
    'Rune matrix deviation exceeds 2σ — anomaly probability elevated.',
    'Similar pattern preceded Protocol Incident #7 by ~6 minutes.',
    'Multi-node correlation suggests coordinated state change.',
  ],
  NODE_SYNC: [
    'Fork resolution pending. Sync convergence expected within window.',
    'Peer count below quorum threshold — sync delay anticipated.',
    'Block propagation latency rising across region.',
  ],
  CONSENSUS_SHIFT: [
    'Voting power redistribution detected across validator set.',
    'Proposal queue depth unusually high — shift probability: elevated.',
    'Historical consensus shift window aligns with current block range.',
  ],
  ORACLE_DEVIATION: [
    'Price feed variance across oracle network exceeding 0.8%.',
    'Source entropy rising — deviation event likely within 5–10 min.',
    'Cross-oracle spread widening. Arbitrage conditions forming.',
  ],
};

function pickSeverity(seed: number): SignalSeverity {
  const r = lcg(seed);
  let cum = 0;
  for (let i = 0; i < SEV_WEIGHTS.length; i++) {
    cum += SEV_WEIGHTS[i];
    if (r < cum) return SEVERITIES[i];
  }
  return 'LOW';
}

/** Generate N past events spread over the last `spanMinutes` minutes */
export function generatePastEvents(
  count: number,
  spanMinutes: number = 90,
  sessionSeed: number = 42,
): TimelineEvent[] {
  const now = Date.now();
  const events: TimelineEvent[] = [];

  for (let i = 0; i < count; i++) {
    const s = hash(`past_${sessionSeed}_${i}`);
    const offsetMinutes = -(spanMinutes * (1 - lcg(s) * 0.95));
    const nodeIdx = Math.floor(lcg(s + 1) * 4);
    const typeIdx  = Math.floor(lcg(s + 2) * SIGNAL_TYPES.length);
    const severity = pickSeverity(s + 3);

    events.push({
      id: `past_${sessionSeed}_${i}`,
      era: 'PAST',
      type: SIGNAL_TYPES[typeIdx],
      severity,
      nodeId:   NODE_IDS[nodeIdx],
      nodeName: NODE_NAMES[nodeIdx],
      timestamp: now + offsetMinutes * 60_000,
      offsetMinutes,
      value: parseFloat((lcg(s + 4) * 100).toFixed(2)),
      resolved: lcg(s + 5) > 0.3,
      txHash: lcg(s + 6) > 0.6 ? `0x${s.toString(16).padStart(8, '0')}...` : undefined,
    });
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

/** Generate N predicted future events spread over the next `spanMinutes` minutes */
export function generatePredictedEvents(
  count: number,
  spanMinutes: number = 45,
  sessionSeed: number = 42,
): TimelineEvent[] {
  const now = Date.now();
  const events: TimelineEvent[] = [];

  for (let i = 0; i < count; i++) {
    const s = hash(`future_${sessionSeed}_${i}`);
    // Cluster predictions closer to NOW with exponential spread
    const rawOffset = lcg(s) * spanMinutes;
    const offsetMinutes = parseFloat((rawOffset + 0.5).toFixed(1));
    const nodeIdx = Math.floor(lcg(s + 1) * 4);
    const typeIdx  = Math.floor(lcg(s + 2) * SIGNAL_TYPES.length);
    const severity = pickSeverity(s + 3);
    const type = SIGNAL_TYPES[typeIdx];

    // Confidence degrades the further into the future
    const confidence = Math.max(20, Math.floor(92 - offsetMinutes * 1.2 + (lcg(s + 7) - 0.5) * 15));
    const notes = PREDICTION_NOTES[type];
    const noteIdx = Math.floor(lcg(s + 8) * notes.length);

    events.push({
      id: `pred_${sessionSeed}_${i}`,
      era: 'PREDICTED',
      type,
      severity,
      nodeId:   NODE_IDS[nodeIdx],
      nodeName: NODE_NAMES[nodeIdx],
      timestamp: now + offsetMinutes * 60_000,
      offsetMinutes,
      value: parseFloat((lcg(s + 4) * 100).toFixed(2)),
      confidence,
      predictionNotes: notes[noteIdx],
      resolved: false,
    });
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

/** Convert live AnomalyEvents (from signalEngine) into PRESENT TimelineEvents */
export function liveEventsToTimeline(events: AnomalyEvent[]): TimelineEvent[] {
  const now = Date.now();
  return events.map(e => ({
    id: e.id,
    era: 'PRESENT' as EventEra,
    type: e.type,
    severity: e.severity,
    nodeId: e.nodeId,
    nodeName: e.nodeName,
    timestamp: e.timestamp,
    offsetMinutes: (e.timestamp - now) / 60_000,
    value: e.value,
    resolved: e.resolved,
  }));
}

/** Severity → visual config */
export const SEV_CONFIG: Record<SignalSeverity, { color: string; glow: string; bg: string; label: string }> = {
  LOW:      { color: '#00e676', glow: 'rgba(0,230,118,0.5)',  bg: 'rgba(0,230,118,0.08)',  label: 'LOW' },
  MEDIUM:   { color: '#fbbf24', glow: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.08)', label: 'WARN' },
  HIGH:     { color: '#fb923c', glow: 'rgba(251,146,60,0.5)', bg: 'rgba(251,146,60,0.08)', label: 'HIGH' },
  CRITICAL: { color: '#ff1744', glow: 'rgba(255,23,68,0.6)',  bg: 'rgba(255,23,68,0.08)',  label: 'CRIT' },
};

export const ERA_CONFIG: Record<EventEra, { label: string; color: string; dimness: number }> = {
  PAST:      { label: 'HISTORICAL', color: '#7c6fa0',  dimness: 0.55 },
  PRESENT:   { label: 'LIVE',       color: '#00e5ff',  dimness: 1.0  },
  PREDICTED: { label: 'PREDICTED',  color: '#c087f5',  dimness: 0.75 },
};

export function formatOffset(offsetMinutes: number): string {
  const abs = Math.abs(offsetMinutes);
  if (abs < 1) return offsetMinutes < 0 ? 'just now' : 'in <1 min';
  if (abs < 60) return offsetMinutes < 0 ? `${Math.round(abs)}m ago` : `in ${Math.round(abs)}m`;
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  return offsetMinutes < 0 ? `${h}h ${m}m ago` : `in ${h}h ${m}m`;
}
