// Deterministic signal simulation engine
// All values are seeded/pseudo-random for realistic simulation

export type NodeStatus = 'ONLINE' | 'PROCESSING' | 'ANOMALY' | 'OFFLINE';
export type SignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SignalType = 'LATENCY_SPIKE' | 'THROUGHPUT_DROP' | 'ANOMALY_DETECTED' | 'NODE_SYNC' | 'CONSENSUS_SHIFT' | 'ORACLE_DEVIATION';

export interface SignalDataPoint {
  timestamp: number;
  value: number;
  label: string;
}

export interface NodeState {
  id: string;
  name: string;
  status: NodeStatus;
  latency: number;
  load: number;
  signalCount: number;
  x: number;
  y: number;
}

export interface AnomalyEvent {
  id: string;
  nodeId: string;
  nodeName: string;
  type: SignalType;
  severity: SignalSeverity;
  timestamp: number;
  value: number;
  resolved: boolean;
}

export interface SignalPrediction {
  anomalyProbability: number;    // 0–100
  highRiskNode: string;
  stabilityScore: number;        // 0–100
  nextEventEta: number;          // seconds
  confidence: number;            // 0–100
  threatVector: string;
}

export interface NetworkMetrics {
  totalSignals: number;
  activeNodes: number;
  avgLatency: number;
  anomalyRate: number;
  throughput: number;
  uptime: number;
}

// Seeded LCG for deterministic pseudo-random
function lcg(seed: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  return ((a * seed + c) % m) / m;
}

function noise(base: number, seed: number, amplitude: number): number {
  return base + (lcg(seed) - 0.5) * 2 * amplitude;
}

const NODE_NAMES = ['Node Alpha', 'Node Beta', 'Node Gamma', 'Node Delta'];
const NODE_IDS = ['alpha', 'beta', 'gamma', 'delta'];

export function generateNodePositions(): { x: number; y: number }[] {
  return [
    { x: 50, y: 20 },   // Alpha — top
    { x: 80, y: 55 },   // Beta — right
    { x: 50, y: 85 },   // Gamma — bottom
    { x: 20, y: 55 },   // Delta — left
  ];
}

export function generateNodeStatus(tick: number): NodeState[] {
  const positions = generateNodePositions();
  return NODE_IDS.map((id, i) => {
    const seed = tick * 17 + i * 31;
    const r = lcg(seed);
    const load = parseFloat(noise(60, seed + 7, 30).toFixed(1));
    const latency = parseFloat(Math.max(8, noise(42, seed + 13, 35)).toFixed(1));
    let status: NodeStatus = 'ONLINE';
    if (r < 0.05) status = 'ANOMALY';
    else if (r < 0.2) status = 'PROCESSING';
    else if (r < 0.02) status = 'OFFLINE';

    return {
      id,
      name: NODE_NAMES[i],
      status,
      latency: Math.min(latency, 200),
      load: Math.min(Math.max(load, 5), 99),
      signalCount: Math.floor(noise(120, seed + 3, 80)),
      x: positions[i].x,
      y: positions[i].y,
    };
  });
}

export function generateSignalTraffic(history: SignalDataPoint[], tick: number): SignalDataPoint[] {
  const now = Date.now();
  const base = 450;
  const seed = tick * 7 + 3;
  const wave = Math.sin(tick * 0.3) * 80;
  const spike = lcg(seed) > 0.92 ? lcg(seed + 1) * 300 : 0;
  const value = Math.max(10, Math.round(base + wave + noise(0, seed, 60) + spike));

  const newPoint: SignalDataPoint = {
    timestamp: now,
    value,
    label: new Date(now).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  const updated = [...history, newPoint];
  return updated.slice(-30); // Keep last 30 points
}

export function generateLatency(history: SignalDataPoint[], tick: number): SignalDataPoint[] {
  const now = Date.now();
  const base = 38;
  const seed = tick * 11 + 5;
  const drift = Math.sin(tick * 0.15) * 12;
  const spike = lcg(seed + 2) > 0.93 ? lcg(seed + 3) * 150 : 0;
  const value = Math.max(5, parseFloat((base + drift + noise(0, seed, 15) + spike).toFixed(1)));

  const newPoint: SignalDataPoint = {
    timestamp: now,
    value,
    label: new Date(now).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  const updated = [...history, newPoint];
  return updated.slice(-30);
}

export function generateAnomalyEvents(history: AnomalyEvent[], tick: number): AnomalyEvent[] {
  const seed = tick * 19 + 7;
  const r = lcg(seed);

  // ~15% chance of new anomaly each tick
  if (r > 0.15) return history.slice(-12);

  const nodeIdx = Math.floor(lcg(seed + 1) * 4);
  const types: SignalType[] = ['LATENCY_SPIKE', 'THROUGHPUT_DROP', 'ANOMALY_DETECTED', 'NODE_SYNC', 'CONSENSUS_SHIFT', 'ORACLE_DEVIATION'];
  const severities: SignalSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const severityWeights = [0.4, 0.35, 0.18, 0.07]; // cumulative

  const typeIdx = Math.floor(lcg(seed + 2) * types.length);
  const sr = lcg(seed + 3);
  let sevIdx = 0;
  let cum = 0;
  for (let i = 0; i < severityWeights.length; i++) {
    cum += severityWeights[i];
    if (sr < cum) { sevIdx = i; break; }
  }

  const event: AnomalyEvent = {
    id: `evt_${tick}_${nodeIdx}`,
    nodeId: NODE_IDS[nodeIdx],
    nodeName: NODE_NAMES[nodeIdx],
    type: types[typeIdx],
    severity: severities[sevIdx],
    timestamp: Date.now(),
    value: parseFloat((lcg(seed + 4) * 100).toFixed(2)),
    resolved: false,
  };

  return [...history, event].slice(-12);
}

export function generateSignalPrediction(nodes: NodeState[], anomalies: AnomalyEvent[], tick: number): SignalPrediction {
  const seed = tick * 23 + 11;

  // Find highest-risk node
  const riskScores = nodes.map(n => {
    let score = 0;
    if (n.status === 'ANOMALY') score += 40;
    else if (n.status === 'PROCESSING') score += 15;
    score += n.latency / 3;
    score += n.load / 4;
    return { name: n.name, score };
  });
  riskScores.sort((a, b) => b.score - a.score);
  const highRiskNode = riskScores[0]?.name || 'Node Alpha';

  const recentCritical = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
  const anomalyRate = anomalies.length / 12;
  const baseProb = 30 + anomalyRate * 25 + recentCritical * 8;
  const anomalyProbability = Math.min(99, Math.floor(baseProb + noise(0, seed, 10)));

  const offlineCount = nodes.filter(n => n.status === 'ANOMALY').length;
  const avgLatency = nodes.reduce((s, n) => s + n.latency, 0) / nodes.length;
  const stabilityScore = Math.max(10, Math.min(99,
    100 - offlineCount * 15 - anomalyRate * 20 - (avgLatency > 80 ? 15 : 0)
  ));

  const nextEventEta = Math.floor(Math.max(5, noise(30, seed + 2, 20)));
  const confidence = Math.floor(70 + lcg(seed + 4) * 25);

  const vectors = ['Whale accumulation pattern', 'Consensus instability', 'Oracle price deviation', 'Liquidity fragmentation', 'Cross-chain bridge delay'];
  const threatVector = vectors[Math.floor(lcg(seed + 5) * vectors.length)];

  return {
    anomalyProbability,
    highRiskNode,
    stabilityScore,
    nextEventEta,
    confidence,
    threatVector,
  };
}

export function generateAnomalyBarData(tick: number): { label: string; anomalies: number; resolved: number }[] {
  const hours = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', 'Now'];
  return hours.map((label, i) => {
    const seed = tick + i * 37;
    const anomalies = Math.floor(lcg(seed) * 18 + 2);
    const resolved = Math.floor(anomalies * (0.5 + lcg(seed + 1) * 0.45));
    return { label, anomalies, resolved };
  });
}

export function generateNetworkMetrics(nodes: NodeState[], tick: number): NetworkMetrics {
  const seed = tick * 13;
  const activeNodes = nodes.filter(n => n.status !== 'OFFLINE').length;
  const avgLatency = parseFloat((nodes.reduce((s, n) => s + n.latency, 0) / nodes.length).toFixed(1));
  const throughput = Math.floor(noise(2400, seed + 1, 400));
  const anomalyRate = parseFloat((lcg(seed + 2) * 3.5 + 0.3).toFixed(2));
  const uptime = parseFloat((99 - lcg(seed + 3) * 1.5).toFixed(3));

  return {
    totalSignals: Math.floor(noise(48200, seed + 4, 500)),
    activeNodes,
    avgLatency,
    anomalyRate,
    throughput,
    uptime,
  };
}
