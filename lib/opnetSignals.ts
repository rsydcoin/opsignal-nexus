import { AnomalyEvent, SignalSeverity, SignalType } from './signalEngine';

export interface OnchainSignalEvent {
  txHash: string;
  signalType: SignalType;
  nodeId: string;
  severity: SignalSeverity;
  timestamp: number;
  walletAddress: string;
  blockNumber: number;
  confirmed: boolean;
  xpEarned: number;
}

export interface TipRecord {
  txHash: string;
  from: string;
  amount: number;
  signalId: string;
  timestamp: number;
  confirmed: boolean;
}

export interface ObserverStats {
  walletAddress: string;
  signalsLogged: number;
  tipsSent: number;
  anomaliesDetected: number;
  xp: number;
  rank: ObserverRank;
}

export type ObserverRank = 'Explorer' | 'Analyst' | 'Signal Hunter' | 'Nexus Guardian';

const XP_THRESHOLDS: Record<ObserverRank, number> = {
  'Explorer': 0,
  'Analyst': 200,
  'Signal Hunter': 600,
  'Nexus Guardian': 1500,
};

export function getObserverRank(xp: number): ObserverRank {
  if (xp >= 1500) return 'Nexus Guardian';
  if (xp >= 600) return 'Signal Hunter';
  if (xp >= 200) return 'Analyst';
  return 'Explorer';
}

export function getRankColor(rank: ObserverRank): string {
  const colors: Record<ObserverRank, string> = {
    'Explorer': '#a78bfa',
    'Analyst': '#00e5ff',
    'Signal Hunter': '#fbbf24',
    'Nexus Guardian': '#ff6d00',
  };
  return colors[rank];
}

export function getRankNextThreshold(xp: number): { current: number; next: number; rank: ObserverRank } {
  const rank = getObserverRank(xp);
  const ranks: ObserverRank[] = ['Explorer', 'Analyst', 'Signal Hunter', 'Nexus Guardian'];
  const idx = ranks.indexOf(rank);
  const nextRank = ranks[idx + 1];
  return {
    current: XP_THRESHOLDS[rank],
    next: nextRank ? XP_THRESHOLDS[nextRank] : XP_THRESHOLDS['Nexus Guardian'],
    rank,
  };
}

function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function generateBlockNumber(): number {
  return 20_000_000 + Math.floor(Math.random() * 500_000);
}

export async function logSignalEvent(
  anomaly: AnomalyEvent,
  walletAddress: string
): Promise<OnchainSignalEvent> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

  const severityXP: Record<SignalSeverity, number> = {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 50,
    CRITICAL: 100,
  };

  const event: OnchainSignalEvent = {
    txHash: generateTxHash(),
    signalType: anomaly.type,
    nodeId: anomaly.nodeId,
    severity: anomaly.severity,
    timestamp: anomaly.timestamp,
    walletAddress,
    blockNumber: generateBlockNumber(),
    confirmed: true,
    xpEarned: severityXP[anomaly.severity],
  };

  // Persist to localStorage signal log
  if (typeof window !== 'undefined') {
    const key = `opsignal_log_${walletAddress}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(event);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  }

  return event;
}

export async function sendSignalTip(
  signalId: string,
  amount: number,
  walletAddress: string
): Promise<TipRecord> {
  await new Promise(r => setTimeout(r, 600 + Math.random() * 600));

  const tip: TipRecord = {
    txHash: generateTxHash(),
    from: walletAddress,
    amount,
    signalId,
    timestamp: Date.now(),
    confirmed: true,
  };

  if (typeof window !== 'undefined') {
    const key = `opsignal_tips_${walletAddress}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(tip);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  }

  return tip;
}

export function loadObserverStats(walletAddress: string): ObserverStats {
  if (typeof window === 'undefined') return defaultStats(walletAddress);

  const logKey = `opsignal_log_${walletAddress}`;
  const tipKey = `opsignal_tips_${walletAddress}`;
  const obsKey = `opsignal_obs_${walletAddress}`;

  const logs: OnchainSignalEvent[] = JSON.parse(localStorage.getItem(logKey) || '[]');
  const tips: TipRecord[] = JSON.parse(localStorage.getItem(tipKey) || '[]');
  const stored: Partial<ObserverStats> = JSON.parse(localStorage.getItem(obsKey) || '{}');

  const signalsLogged = logs.length + (stored.signalsLogged || 0);
  const tipsSent = tips.length + (stored.tipsSent || 0);
  const anomaliesDetected = stored.anomaliesDetected || 0;
  const logXP = logs.reduce((sum, e) => sum + (e.xpEarned || 0), 0);
  const tipXP = tips.length * 15;
  const xp = logXP + tipXP + anomaliesDetected * 5 + (stored.xp || 0);

  return {
    walletAddress,
    signalsLogged,
    tipsSent,
    anomaliesDetected,
    xp,
    rank: getObserverRank(xp),
  };
}

function defaultStats(walletAddress: string): ObserverStats {
  return {
    walletAddress,
    signalsLogged: 0,
    tipsSent: 0,
    anomaliesDetected: 0,
    xp: 0,
    rank: 'Explorer',
  };
}

export function saveObserverXP(walletAddress: string, delta: number): void {
  if (typeof window === 'undefined') return;
  const key = `opsignal_obs_${walletAddress}`;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  stored.xp = (stored.xp || 0) + delta;
  localStorage.setItem(key, JSON.stringify(stored));
}

// Mock leaderboard data
export function getObserverLeaderboard(myStats?: ObserverStats) {
  const mock = [
    { walletAddress: '0xA1b2...C3d4', signalsLogged: 312, tipsSent: 78, anomaliesDetected: 45, xp: 4280, rank: 'Nexus Guardian' as ObserverRank },
    { walletAddress: '0xE5f6...G7h8', signalsLogged: 241, tipsSent: 55, anomaliesDetected: 33, xp: 3140, rank: 'Nexus Guardian' as ObserverRank },
    { walletAddress: '0xI9j0...K1l2', signalsLogged: 178, tipsSent: 42, anomaliesDetected: 28, xp: 2290, rank: 'Signal Hunter' as ObserverRank },
    { walletAddress: '0xM3n4...O5p6', signalsLogged: 134, tipsSent: 31, anomaliesDetected: 19, xp: 1640, rank: 'Signal Hunter' as ObserverRank },
    { walletAddress: '0xQ7r8...S9t0', signalsLogged: 98,  tipsSent: 22, anomaliesDetected: 14, xp: 1180, rank: 'Signal Hunter' as ObserverRank },
    { walletAddress: '0xU1v2...W3x4', signalsLogged: 67,  tipsSent: 15, anomaliesDetected: 9,  xp: 780,  rank: 'Analyst' as ObserverRank },
    { walletAddress: '0xY5z6...A7b8', signalsLogged: 44,  tipsSent: 9,  anomaliesDetected: 6,  xp: 490,  rank: 'Analyst' as ObserverRank },
    { walletAddress: '0xC9d0...E1f2', signalsLogged: 28,  tipsSent: 5,  anomaliesDetected: 3,  xp: 290,  rank: 'Analyst' as ObserverRank },
  ];

  if (myStats && myStats.signalsLogged > 0) {
    const insertAt = mock.findIndex(m => m.xp < myStats.xp);
    const pos = insertAt === -1 ? mock.length : insertAt;
    mock.splice(pos, 0, myStats);
  }

  return mock.slice(0, 10).map((entry, i) => ({ ...entry, rank_num: i + 1 }));
}
