'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import HUD from '@/components/HUD';
import LiveSignalDashboard from '@/components/LiveSignalDashboard';
import SignalNetworkMap from '@/components/SignalNetworkMap';
import SignalPredictionPanel from '@/components/SignalPredictionPanel';
import SignalTip from '@/components/SignalTip';
import { useWallet } from '@/lib/walletContext';
import {
  generateNodeStatus, generateAnomalyEvents, generateSignalPrediction,
  generateNetworkMetrics, NodeState, AnomalyEvent, SignalPrediction, NetworkMetrics,
} from '@/lib/signalEngine';
import {
  logSignalEvent, loadObserverStats, saveObserverXP,
  getObserverRank, getRankColor, ObserverStats,
} from '@/lib/opnetSignals';
import Link from 'next/link';

const SEVERITY_COLOR: Record<string, string> = {
  LOW: '#00e676', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#ff1744',
};

export default function ObservatoryPage() {
  const { walletAddress, isConnected } = useWallet();
  const [tick, setTick] = useState(0);
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [prediction, setPrediction] = useState<SignalPrediction | null>(null);
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [observerStats, setObserverStats] = useState<ObserverStats | null>(null);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [tippingAnomaly, setTippingAnomaly] = useState<AnomalyEvent | null>(null);
  const [toasts, setToasts] = useState<{ id: string; msg: string; color: string }[]>([]);
  const tickRef = useRef(0);

  // Load observer stats
  useEffect(() => {
    if (walletAddress) {
      setObserverStats(loadObserverStats(walletAddress));
    }
  }, [walletAddress]);

  // Main simulation loop every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      const t = tickRef.current;
      setTick(t);

      const newNodes = generateNodeStatus(t);
      setNodes(newNodes);
      setAnomalies(prev => generateAnomalyEvents(prev, t));
      setPrediction(generateSignalPrediction(newNodes, anomalies, t));
      setMetrics(generateNetworkMetrics(newNodes, t));
    }, 2000);

    // Initialize immediately
    const initNodes = generateNodeStatus(0);
    setNodes(initNodes);
    setAnomalies([]);
    setPrediction(generateSignalPrediction(initNodes, [], 0));
    setMetrics(generateNetworkMetrics(initNodes, 0));

    return () => clearInterval(interval);
  }, []);

  const addToast = (msg: string, color: string) => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, msg, color }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleLogSignal = async (anomaly: AnomalyEvent) => {
    if (!walletAddress || loggingId) return;
    setLoggingId(anomaly.id);
    try {
      await logSignalEvent(anomaly, walletAddress);
      setLoggedIds(prev => new Set(Array.from(prev).concat(anomaly.id)));
      const xp = anomaly.severity === 'CRITICAL' ? 100 : anomaly.severity === 'HIGH' ? 50 : anomaly.severity === 'MEDIUM' ? 25 : 10;
      saveObserverXP(walletAddress, xp);
      setObserverStats(loadObserverStats(walletAddress));
      addToast(`Signal logged onchain. +${xp} XP`, '#00e676');
    } catch {
      addToast('Log failed. Try again.', '#ff1744');
    } finally {
      setLoggingId(null);
    }
  };

  const rank = observerStats ? observerStats.rank : 'Explorer';
  const rankColor = getRankColor(rank);

  return (
    <div className="min-h-screen bg-[#020818]">
      <HUD />

      {/* Animated grid background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ opacity: 0.35 }}>
        <div style={{
          backgroundImage: 'linear-gradient(rgba(123,46,200,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(123,46,200,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          width: '100%', height: '100%',
        }} />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
            <div>
              <div className="font-display text-xl text-yellow-400 tracking-widest">
                🛰 SIGNAL OBSERVATORY
              </div>
              <div className="font-mono text-[10px] text-purple-400/60 tracking-wider">
                AI Signal Intelligence · Real-time Monitoring
              </div>
            </div>
          </div>

          {/* Observer Rank Badge */}
          {isConnected && observerStats && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="font-mono text-[10px] text-purple-400/60">OBSERVER RANK</div>
                <div className="font-display text-sm font-bold" style={{ color: rankColor }}>{rank}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg border font-mono text-xs"
                style={{
                  background: `${rankColor}15`,
                  borderColor: `${rankColor}40`,
                  color: rankColor,
                }}>
                {observerStats.xp} XP
              </div>
            </div>
          )}
        </div>

        {/* Network Metrics Bar */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
            {[
              { label: 'TOTAL SIGNALS', value: metrics.totalSignals.toLocaleString(), color: '#00e5ff' },
              { label: 'ACTIVE NODES', value: `${metrics.activeNodes}/4`, color: '#00e676' },
              { label: 'AVG LATENCY', value: `${metrics.avgLatency}ms`, color: '#fbbf24' },
              { label: 'ANOMALY RATE', value: `${metrics.anomalyRate}/hr`, color: '#ff6b6b' },
              { label: 'THROUGHPUT', value: `${metrics.throughput}/s`, color: '#c087f5' },
              { label: 'UPTIME', value: `${metrics.uptime}%`, color: '#00e676' },
            ].map(m => (
              <div key={m.label}
                className="rounded-lg px-3 py-2 border text-center"
                style={{
                  background: 'rgba(7,17,51,0.9)',
                  borderColor: `${m.color}25`,
                }}>
                <div className="font-mono text-base font-bold" style={{ color: m.color }}>{m.value}</div>
                <div className="font-mono text-[9px] text-purple-400/50 tracking-wider mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 mb-5">

          {/* Network Map (spans 2) */}
          <div className="xl:col-span-2 rounded-xl border overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(7,17,51,0.97), rgba(18,8,36,0.97))',
              borderColor: 'rgba(245,158,11,0.2)',
              minHeight: 340,
            }}>
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
              <div>
                <div className="font-display text-xs text-yellow-400 tracking-widest font-bold">SIGNAL NETWORK MAP</div>
                <div className="font-mono text-[10px] text-purple-400/50">Live node topology</div>
              </div>
              <div className="flex gap-2">
                {nodes.map(n => (
                  <div key={n.id} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{
                      background: n.status === 'ANOMALY' ? '#ff1744' : n.status === 'PROCESSING' ? '#00e5ff' : '#00e676',
                    }} />
                  </div>
                ))}
              </div>
            </div>
            <SignalNetworkMap nodes={nodes} className="p-4" />
          </div>

          {/* Prediction Panel */}
          <div className="xl:col-span-1">
            {prediction ? (
              <SignalPredictionPanel prediction={prediction} isLive />
            ) : (
              <div className="rounded-xl border h-full flex items-center justify-center"
                style={{ borderColor: 'rgba(123,46,200,0.2)', background: 'rgba(7,17,51,0.9)' }}>
                <div className="text-purple-400/40 font-mono text-xs">Loading oracle...</div>
              </div>
            )}
          </div>

          {/* Node Status Panel */}
          <div className="xl:col-span-1 rounded-xl border overflow-hidden"
            style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(0,229,255,0.2)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,229,255,0.15)' }}>
              <div className="font-display text-xs text-cyan-400 tracking-widest font-bold">NODE STATUS</div>
            </div>
            <div className="p-3 space-y-2">
              {/* Center node */}
              <NodeStatusRow name="AI Signal Engine" status="ONLINE" latency={2.1} load={44} isCenter />
              {nodes.map(node => (
                <NodeStatusRow key={node.id} name={node.name}
                  status={node.status} latency={node.latency} load={node.load} />
              ))}
            </div>
          </div>
        </div>

        {/* Live Charts */}
        <div className="mb-5">
          <div className="font-display text-xs text-purple-400/60 tracking-widest mb-3">LIVE TELEMETRY</div>
          <LiveSignalDashboard tick={tick} />
        </div>

        {/* Anomaly Event Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border overflow-hidden"
            style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(255,23,68,0.2)' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(255,23,68,0.15)' }}>
              <div>
                <div className="font-display text-xs text-red-400 tracking-widest font-bold">ANOMALY EVENT LOG</div>
                <div className="font-mono text-[10px] text-purple-400/50">{anomalies.length} events</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            </div>
            <div className="divide-y max-h-80 overflow-y-auto" style={{ divideColor: 'rgba(255,23,68,0.1)' }}>
              {anomalies.length === 0 ? (
                <div className="px-4 py-8 text-center font-mono text-xs text-purple-400/40">
                  No anomalies detected...
                </div>
              ) : (
                [...anomalies].reverse().map(evt => {
                  const color = SEVERITY_COLOR[evt.severity] || '#c087f5';
                  const isLogged = loggedIds.has(evt.id);
                  const isLogging = loggingId === evt.id;

                  return (
                    <div key={evt.id}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-red-500/5 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold" style={{ color }}>
                            {evt.type.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[9px] px-1 rounded"
                            style={{ background: `${color}15`, color }}>
                            {evt.severity}
                          </span>
                        </div>
                        <div className="font-ui text-[10px] text-purple-400/70 truncate">
                          {evt.nodeName} · {new Date(evt.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setTippingAnomaly(evt === tippingAnomaly ? null : evt)}
                          className="font-mono text-[9px] px-2 py-1 rounded transition-all"
                          style={{
                            background: 'rgba(123,46,200,0.1)',
                            border: '1px solid rgba(123,46,200,0.2)',
                            color: '#9b4de8',
                          }}>
                          TIP
                        </button>
                        <button
                          onClick={() => handleLogSignal(evt)}
                          disabled={!isConnected || isLogged || !!loggingId}
                          className="font-mono text-[9px] px-2 py-1 rounded transition-all disabled:opacity-40"
                          style={{
                            background: isLogged ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)',
                            border: `1px solid ${isLogged ? 'rgba(0,230,118,0.3)' : 'rgba(255,23,68,0.3)'}`,
                            color: isLogged ? '#00e676' : '#ff6b6b',
                          }}>
                          {isLogging ? '...' : isLogged ? '✓' : 'LOG'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Tip panel / Observer Stats */}
          <div className="space-y-4">
            {tippingAnomaly && walletAddress ? (
              <SignalTip
                anomaly={tippingAnomaly}
                walletAddress={walletAddress}
                onTipSent={(xp) => {
                  setObserverStats(loadObserverStats(walletAddress));
                  addToast(`Tip sent! +${xp} XP`, '#c087f5');
                  setTippingAnomaly(null);
                }}
              />
            ) : null}

            {/* Observer Stats */}
            {isConnected && observerStats && (
              <div className="rounded-xl border overflow-hidden"
                style={{ background: 'rgba(7,17,51,0.97)', borderColor: `${rankColor}30` }}>
                <div className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: `${rankColor}20` }}>
                  <div className="font-display text-xs tracking-widest font-bold" style={{ color: rankColor }}>
                    OBSERVER PROFILE
                  </div>
                  <div className="font-mono text-xs px-2 py-0.5 rounded font-bold"
                    style={{ background: `${rankColor}15`, color: rankColor, border: `1px solid ${rankColor}30` }}>
                    {rank}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  <StatCell label="XP Earned" value={observerStats.xp.toLocaleString()} color={rankColor} />
                  <StatCell label="Signals Logged" value={observerStats.signalsLogged.toString()} color="#00e5ff" />
                  <StatCell label="Tips Sent" value={observerStats.tipsSent.toString()} color="#c087f5" />
                  <StatCell label="Anomalies" value={observerStats.anomaliesDetected.toString()} color="#ff6b6b" />
                </div>
                <div className="px-4 pb-4">
                  <Link href="/leaderboard"
                    className="block text-center py-2 rounded-lg font-display text-xs tracking-widest transition-all hover:opacity-90"
                    style={{
                      background: `${rankColor}15`,
                      border: `1px solid ${rankColor}30`,
                      color: rankColor,
                    }}>
                    VIEW LEADERBOARD →
                  </Link>
                </div>
              </div>
            )}

            {!isConnected && (
              <div className="rounded-xl border p-6 text-center"
                style={{ borderColor: 'rgba(123,46,200,0.2)', background: 'rgba(7,17,51,0.9)' }}>
                <div className="text-3xl mb-3">🛰</div>
                <div className="font-display text-yellow-400 text-sm tracking-widest mb-2">CONNECT TO OBSERVE</div>
                <div className="font-body italic text-purple-300/60 text-xs">
                  Log anomalies onchain and earn Observer XP
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map(toast => (
          <div key={toast.id}
            className="rounded-lg px-4 py-2.5 border font-mono text-xs shadow-lg"
            style={{
              background: 'rgba(4,13,36,0.98)',
              borderColor: `${toast.color}50`,
              color: toast.color,
              animation: 'slideIn 0.3s ease',
            }}>
            {toast.msg}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function NodeStatusRow({ name, status, latency, load, isCenter }: {
  name: string; status: string; latency: number; load: number; isCenter?: boolean;
}) {
  const colors: Record<string, string> = {
    ONLINE: '#00e676', PROCESSING: '#00e5ff', ANOMALY: '#ff1744', OFFLINE: '#4a3870',
  };
  const color = colors[status] || '#c087f5';

  return (
    <div className="rounded-lg px-3 py-2 border flex items-center gap-2"
      style={{
        borderColor: `${color}20`,
        background: isCenter ? 'rgba(245,158,11,0.05)' : `${color}05`,
      }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }}>
        {status !== 'OFFLINE' && (
          <div className="w-full h-full rounded-full animate-ping" style={{ background: color, opacity: 0.4 }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-ui text-xs truncate" style={{ color: isCenter ? '#fbbf24' : 'rgba(220,200,255,0.8)' }}>
          {name}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-mono text-[10px] text-purple-400/70">{latency.toFixed(0)}ms</span>
        <span className="font-mono text-[10px] text-purple-400/70">{load.toFixed(0)}%</span>
        <span className="font-mono text-[9px] px-1.5 rounded font-bold"
          style={{ color, background: `${color}15` }}>
          {status}
        </span>
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2.5 border text-center"
      style={{ borderColor: `${color}20`, background: `${color}08` }}>
      <div className="font-mono text-base font-bold" style={{ color }}>{value}</div>
      <div className="font-mono text-[9px] text-purple-400/50 mt-0.5">{label}</div>
    </div>
  );
}
