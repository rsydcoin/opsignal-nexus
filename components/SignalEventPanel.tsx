'use client';

import { useState, useEffect } from 'react';
import { TimelineEvent, SEV_CONFIG, ERA_CONFIG, formatOffset } from '@/lib/timeMachineEngine';
import { logSignalEvent, saveObserverXP } from '@/lib/opnetSignals';
import { AnomalyEvent } from '@/lib/signalEngine';

interface SignalEventPanelProps {
  event: TimelineEvent | null;
  walletAddress: string | null;
  onClose: () => void;
  onLogged?: (txHash: string, xp: number) => void;
}

const TYPE_ICONS: Record<string, string> = {
  LATENCY_SPIKE:    '⚡',
  THROUGHPUT_DROP:  '📉',
  ANOMALY_DETECTED: '🔴',
  NODE_SYNC:        '🔄',
  CONSENSUS_SHIFT:  '⚖',
  ORACLE_DEVIATION: '🔮',
};

export default function SignalEventPanel({ event, walletAddress, onClose, onLogged }: SignalEventPanelProps) {
  const [visible, setVisible] = useState(false);
  const [logStatus, setLogStatus] = useState<'idle' | 'signing' | 'sending' | 'done' | 'error'>('idle');
  const [txResult, setTxResult] = useState<{ hash: string; xp: number } | null>(null);

  // Animate in/out
  useEffect(() => {
    if (event) {
      requestAnimationFrame(() => setVisible(true));
      setLogStatus('idle');
      setTxResult(null);
    } else {
      setVisible(false);
    }
  }, [event]);

  if (!event) return null;

  const sev   = SEV_CONFIG[event.severity];
  const era   = ERA_CONFIG[event.era];
  const icon  = TYPE_ICONS[event.type] ?? '◈';
  const isPredicted = event.era === 'PREDICTED';
  const canLog = !!walletAddress && event.era !== 'PREDICTED' && logStatus === 'idle';

  const handleLog = async () => {
    if (!walletAddress || !canLog) return;
    setLogStatus('signing');
    await new Promise(r => setTimeout(r, 500));
    setLogStatus('sending');

    // Build a compatible AnomalyEvent for logSignalEvent
    const anomalyEvt: AnomalyEvent = {
      id: event.id,
      nodeId: event.nodeId,
      nodeName: event.nodeName,
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
      value: event.value,
      resolved: event.resolved,
    };

    try {
      const result = await logSignalEvent(anomalyEvt, walletAddress);
      const xp = result.xpEarned;
      saveObserverXP(walletAddress, xp);
      setTxResult({ hash: result.txHash, xp });
      setLogStatus('done');
      onLogged?.(result.txHash, xp);
    } catch {
      setLogStatus('error');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onClick={handleOverlayClick}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col"
        style={{
          background: 'linear-gradient(160deg, rgba(6,14,44,0.99) 0%, rgba(20,8,40,0.99) 100%)',
          borderLeft: `1px solid ${sev.color}30`,
          boxShadow: `-20px 0 60px rgba(0,0,0,0.6), -2px 0 0 ${sev.color}25`,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Top accent stripe */}
        <div className="h-0.5 flex-shrink-0"
          style={{ background: `linear-gradient(90deg, transparent, ${sev.color}, transparent)` }} />

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 flex-shrink-0 border-b"
          style={{ borderColor: `${sev.color}15` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: sev.bg, border: `1px solid ${sev.color}40` }}>
              {icon}
            </div>
            <div>
              <div className="font-display text-xs tracking-widest font-bold" style={{ color: sev.color }}>
                {event.type.replace(/_/g, ' ')}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: `${era.color}15`, color: era.color, border: `1px solid ${era.color}25` }}>
                  {era.label}
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}30` }}>
                  {event.severity}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: 'rgba(180,160,220,0.5)' }}>
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Temporal info */}
          <Section title="TEMPORAL DATA" color="#00e5ff">
            <Row label="Timestamp"
              value={new Date(event.timestamp).toLocaleString('en-US', { hour12: false })} />
            <Row label="Relative"  value={formatOffset(event.offsetMinutes)} highlight={sev.color} />
            <Row label="Era"       value={era.label} highlight={era.color} />
            {isPredicted && event.confidence !== undefined && (
              <>
                <Row label="Confidence" value={`${event.confidence}%`}
                  highlight={event.confidence >= 70 ? '#00e676' : event.confidence >= 45 ? '#fbbf24' : '#ff6b6b'} />
                <ConfidenceBar value={event.confidence} />
              </>
            )}
          </Section>

          {/* Node info */}
          <Section title="NODE" color="#c087f5">
            <Row label="Node ID"   value={event.nodeId.toUpperCase()} />
            <Row label="Node Name" value={event.nodeName} highlight="#c087f5" />
            <Row label="Value"     value={event.value.toFixed(2)} />
            <Row label="Resolved"  value={event.resolved ? 'YES' : 'NO'}
              highlight={event.resolved ? '#00e676' : sev.color} />
          </Section>

          {/* Previous log */}
          {event.txHash && (
            <Section title="LOGGED ONCHAIN" color="#00e676">
              <div className="font-mono text-[10px] break-all leading-relaxed"
                style={{ color: '#00e676' }}>
                {event.txHash}
              </div>
            </Section>
          )}

          {/* Prediction notes */}
          {isPredicted && event.predictionNotes && (
            <Section title="ORACLE ANALYSIS" color="#c087f5">
              <div className="relative rounded-lg p-3"
                style={{ background: 'rgba(123,46,200,0.08)', border: '1px solid rgba(123,46,200,0.2)' }}>
                {/* Scan line */}
                <div className="absolute inset-x-0 top-0 h-px overflow-hidden rounded-t-lg">
                  <div style={{
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #c087f5, transparent)',
                    animation: 'slideRight 3s linear infinite',
                  }} />
                </div>
                <div className="flex gap-2">
                  <span className="text-base flex-shrink-0">🔮</span>
                  <p className="font-body italic text-purple-200/80 text-sm leading-relaxed">
                    {event.predictionNotes}
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* Signal fingerprint visualizer */}
          <Section title="SIGNAL FINGERPRINT" color={sev.color}>
            <SignalFingerprint event={event} />
          </Section>
        </div>

        {/* Log button footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t" style={{ borderColor: `${sev.color}15` }}>
          {logStatus === 'done' && txResult ? (
            <div className="rounded-xl p-4 text-center border"
              style={{ background: 'rgba(0,230,118,0.06)', borderColor: 'rgba(0,230,118,0.3)' }}>
              <div className="font-display text-xs text-emerald-400 tracking-widest mb-2">
                ✓ LOGGED ONCHAIN
              </div>
              <div className="font-mono text-[9px] text-emerald-300/60 break-all mb-2">
                {txResult.hash.slice(0, 32)}...
              </div>
              <div className="font-mono text-xs text-yellow-400 font-bold">
                +{txResult.xp} XP earned
              </div>
            </div>
          ) : isPredicted ? (
            <div className="rounded-xl p-3 text-center border"
              style={{ background: 'rgba(123,46,200,0.06)', borderColor: 'rgba(123,46,200,0.2)' }}>
              <div className="font-mono text-[10px] text-purple-400/60">
                Predicted events cannot be logged until they occur
              </div>
            </div>
          ) : (
            <button
              onClick={handleLog}
              disabled={!canLog || logStatus !== 'idle'}
              className="w-full rounded-xl py-3 font-display text-sm tracking-widest transition-all disabled:opacity-40 relative overflow-hidden"
              style={{
                background: logStatus === 'error' ? 'rgba(255,23,68,0.12)' : `${sev.color}12`,
                border: `1px solid ${logStatus === 'error' ? '#ff1744' : sev.color}50`,
                color: logStatus === 'error' ? '#ff6b6b' : sev.color,
              }}
            >
              {/* Shimmer while sending */}
              {(logStatus === 'signing' || logStatus === 'sending') && (
                <div className="absolute inset-0 overflow-hidden">
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(90deg, transparent 0%, ${sev.color}20 50%, transparent 100%)`,
                    animation: 'shimmer 1.2s ease-in-out infinite',
                  }} />
                </div>
              )}
              <span className="relative z-10">
                {!walletAddress ? '🔒 CONNECT WALLET TO LOG' :
                 logStatus === 'signing' ? '⚡ SIGNING...' :
                 logStatus === 'sending' ? '📡 BROADCASTING...' :
                 logStatus === 'error'   ? '✕ BROADCAST FAILED — RETRY' :
                 event.txHash            ? '✓ ALREADY LOGGED' :
                 '⛓ LOG SIGNAL ONCHAIN'}
              </span>
            </button>
          )}
        </div>
      </div>


    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="font-mono text-[9px] tracking-[0.2em]" style={{ color: `${color}90` }}>{title}</div>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}25, transparent)` }} />
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="font-mono text-[10px] text-purple-400/50 tracking-wider">{label}</span>
      <span className="font-mono text-[11px] font-medium" style={{ color: highlight ?? 'rgba(220,200,255,0.85)' }}>
        {value}
      </span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? '#00e676' : value >= 45 ? '#fbbf24' : '#ff6b6b';
  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(123,46,200,0.15)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 6px ${color}60` }} />
      </div>
    </div>
  );
}

function SignalFingerprint({ event }: { event: TimelineEvent }) {
  const sev = SEV_CONFIG[event.severity];
  // Generate a stable bar fingerprint from the event id hash
  const bars = Array.from({ length: 24 }, (_, i) => {
    let h = 2166136261;
    const str = event.id + i;
    for (let j = 0; j < str.length; j++) {
      h ^= str.charCodeAt(j);
      h = (Math.imul(h, 16777619)) >>> 0;
    }
    return (h % 1000) / 1000;
  });

  return (
    <div className="flex items-end gap-0.5 h-10 w-full">
      {bars.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all"
          style={{
            height: `${Math.max(8, v * 100)}%`,
            background: `${sev.color}${event.era === 'PAST' ? '50' : event.era === 'PREDICTED' ? '40' : '80'}`,
            opacity: event.era === 'PREDICTED' ? 0.6 + v * 0.4 : 1,
          }} />
      ))}
    </div>
  );
}
