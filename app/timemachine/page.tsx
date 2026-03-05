'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import HUD from '@/components/HUD';
import SignalTimeline from '@/components/SignalTimeline';
import SignalEventPanel from '@/components/SignalEventPanel';
import { useWallet } from '@/lib/walletContext';
import {
  generatePastEvents, generatePredictedEvents, liveEventsToTimeline,
  TimelineEvent, SEV_CONFIG, ERA_CONFIG, formatOffset,
} from '@/lib/timeMachineEngine';
import { generateAnomalyEvents } from '@/lib/signalEngine';
import { AnomalyEvent } from '@/lib/signalEngine';
import Link from 'next/link';

// Severity counts for the summary strip
function countBySeverity(events: TimelineEvent[]) {
  return {
    CRITICAL: events.filter(e => e.severity === 'CRITICAL').length,
    HIGH:     events.filter(e => e.severity === 'HIGH').length,
    MEDIUM:   events.filter(e => e.severity === 'MEDIUM').length,
    LOW:      events.filter(e => e.severity === 'LOW').length,
  };
}

export default function TimeMachinePage() {
  const { walletAddress, isConnected } = useWallet();

  // Stable past + predicted (generated once, seeded by session)
  const sessionSeed = useRef(Math.floor(Math.random() * 9999));
  const pastEvents      = useMemo(() => generatePastEvents(28, 90, sessionSeed.current),      []);
  const predictedEvents = useMemo(() => generatePredictedEvents(14, 45, sessionSeed.current), []);

  // Live anomaly events that update every 2 s
  const [liveAnomalies, setLiveAnomalies] = useState<AnomalyEvent[]>([]);
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      setLiveAnomalies(prev => generateAnomalyEvents(prev, tickRef.current));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const presentEvents = useMemo(() => liveEventsToTimeline(liveAnomalies), [liveAnomalies]);

  const allEvents: TimelineEvent[] = useMemo(
    () => [...pastEvents, ...presentEvents, ...predictedEvents],
    [pastEvents, presentEvents, predictedEvents],
  );

  // Selection state
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'ALL' | 'PAST' | 'PRESENT' | 'PREDICTED'>('ALL');
  const [sevFilter, setSevFilter] = useState<string>('ALL');

  const filteredEvents = useMemo(() => allEvents.filter(e => {
    if (filter !== 'ALL' && e.era !== filter) return false;
    if (sevFilter !== 'ALL' && e.severity !== sevFilter) return false;
    return true;
  }), [allEvents, filter, sevFilter]);

  const counts      = useMemo(() => countBySeverity(allEvents), [allEvents]);
  const predictCrit = predictedEvents.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;

  const handleLogged = (txHash: string, xp: number) => {
    if (selectedEvent) setLoggedIds(prev => new Set(Array.from(prev).concat(selectedEvent.id)));
  };

  return (
    <div className="min-h-screen bg-[#020818]">
      <HUD />

      {/* Subtle grid background */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(123,46,200,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(123,46,200,0.07) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        opacity: 0.8,
      }} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/observatory" className="font-ui text-sm text-purple-400 hover:text-yellow-400 transition-colors">
              ← Observatory
            </Link>
            <div>
              <div className="font-display text-xl sm:text-2xl text-yellow-400 tracking-widest leading-tight">
                ⏳ SIGNAL TIME MACHINE
              </div>
              <div className="font-mono text-[10px] text-purple-400/50 tracking-wider mt-0.5">
                Historical · Live · Predicted · {allEvents.length} total events
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border self-start sm:self-auto"
            style={{ background: 'rgba(0,229,255,0.05)', borderColor: 'rgba(0,229,255,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-xs text-cyan-400">LIVE FEED</span>
            <span className="font-mono text-[10px] text-cyan-400/50">{presentEvents.length} active</span>
          </div>
        </div>

        {/* ── Summary strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
          <SummaryCard label="TOTAL"    value={allEvents.length}      color="#c087f5" />
          <SummaryCard label="PAST"     value={pastEvents.length}     color={ERA_CONFIG.PAST.color} />
          <SummaryCard label="LIVE"     value={presentEvents.length}  color={ERA_CONFIG.PRESENT.color} pulse />
          <SummaryCard label="PREDICT"  value={predictedEvents.length}color={ERA_CONFIG.PREDICTED.color} />
          <SummaryCard label="CRITICAL" value={counts.CRITICAL}       color={SEV_CONFIG.CRITICAL.color} />
          <SummaryCard label="HIGH"     value={counts.HIGH}           color={SEV_CONFIG.HIGH.color} />
          <SummaryCard label="AT RISK"  value={predictCrit}           color="#ff6b6b"
            subtitle="predicted high+" />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="font-mono text-[10px] text-purple-400/50 tracking-widest mr-1">ERA</span>
          {(['ALL', 'PAST', 'PRESENT', 'PREDICTED'] as const).map(f => (
            <FilterChip key={f} label={f} active={filter === f}
              color={f === 'ALL' ? '#c087f5' : ERA_CONFIG[f === 'PRESENT' ? 'PRESENT' : f]?.color ?? '#c087f5'}
              onClick={() => setFilter(f)} />
          ))}

          <div className="w-px h-4 bg-purple-500/20 mx-1" />

          <span className="font-mono text-[10px] text-purple-400/50 tracking-widest mr-1">SEV</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(s => (
            <FilterChip key={s} label={s} active={sevFilter === s}
              color={s === 'ALL' ? '#c087f5' : SEV_CONFIG[s]?.color ?? '#c087f5'}
              onClick={() => setSevFilter(s)} />
          ))}
        </div>

        {/* ── Timeline ── */}
        <div className="mb-6">
          <SignalTimeline
            events={filteredEvents}
            selectedId={selectedEvent?.id ?? null}
            onSelect={setSelectedEvent}
            isLive
          />
        </div>

        {/* ── Event list grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent / filtered event list */}
          <div className="rounded-xl border overflow-hidden"
            style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(123,46,200,0.25)' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(123,46,200,0.15)' }}>
              <div className="font-display text-xs text-purple-300 tracking-widest font-bold">EVENT LOG</div>
              <div className="font-mono text-[10px] text-purple-400/50">{filteredEvents.length} events</div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
              {filteredEvents.length === 0 ? (
                <div className="px-4 py-10 text-center font-mono text-xs text-purple-400/30">
                  No events match current filters
                </div>
              ) : (
                [...filteredEvents]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map(evt => {
                    const sev = SEV_CONFIG[evt.severity];
                    const era = ERA_CONFIG[evt.era];
                    const isSelected = selectedEvent?.id === evt.id;
                    const isLogged   = loggedIds.has(evt.id) || !!evt.txHash;

                    return (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="w-full text-left px-4 py-2.5 border-b flex items-center gap-3 transition-all"
                        style={{
                          borderColor: 'rgba(123,46,200,0.08)',
                          background: isSelected ? `${sev.color}08` : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(123,46,200,0.06)'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        {/* Severity dot */}
                        <div className="flex-shrink-0 relative">
                          <div className="w-2 h-2 rounded-full" style={{ background: sev.color }} />
                          {evt.era === 'PRESENT' && (
                            <div className="absolute inset-0 rounded-full animate-ping"
                              style={{ background: sev.color, opacity: 0.4 }} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[11px] font-bold truncate" style={{ color: sev.color }}>
                              {evt.type.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-[8px] px-1 rounded flex-shrink-0"
                              style={{ color: era.color, background: `${era.color}12`, border: `1px solid ${era.color}20` }}>
                              {evt.era === 'PRESENT' ? 'LIVE' : evt.era}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-purple-400/60">
                            <span>{evt.nodeName}</span>
                            <span>·</span>
                            <span>{formatOffset(evt.offsetMinutes)}</span>
                            {evt.era === 'PREDICTED' && evt.confidence !== undefined && (
                              <><span>·</span><span style={{ color: '#c087f5' }}>{evt.confidence}% conf</span></>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}25` }}>
                            {evt.severity}
                          </span>
                          {isLogged && (
                            <span className="font-mono text-[8px] text-emerald-400">⛓ logged</span>
                          )}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          {/* Prediction intelligence panel */}
          <div className="rounded-xl border overflow-hidden"
            style={{ background: 'rgba(7,17,51,0.97)', borderColor: 'rgba(192,135,245,0.25)' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(192,135,245,0.15)' }}>
              <div className="font-display text-xs text-purple-300 tracking-widest font-bold">PREDICTION INTELLIGENCE</div>
              <span className="font-mono text-[10px] text-purple-400/50">{predictedEvents.length} forecasts</span>
            </div>

            <div className="p-4 space-y-3">
              {/* Prediction confidence histogram */}
              <div>
                <div className="font-mono text-[9px] text-purple-400/40 tracking-widest mb-2">CONFIDENCE DISTRIBUTION</div>
                <div className="flex items-end gap-1 h-16">
                  {Array.from({ length: 10 }, (_, i) => {
                    const lo = i * 10, hi = lo + 10;
                    const cnt = predictedEvents.filter(e => (e.confidence ?? 0) >= lo && (e.confidence ?? 0) < hi).length;
                    const maxCnt = Math.max(1, ...Array.from({ length: 10 }, (_, j) =>
                      predictedEvents.filter(e => (e.confidence ?? 0) >= j * 10 && (e.confidence ?? 0) < j * 10 + 10).length
                    ));
                    const color = hi <= 40 ? '#ff6b6b' : hi <= 70 ? '#fbbf24' : '#00e676';
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-t-sm transition-all"
                          style={{
                            height: `${Math.max(4, (cnt / maxCnt) * 100)}%`,
                            background: color,
                            opacity: cnt === 0 ? 0.2 : 0.75,
                          }} />
                        <span className="font-mono text-[7px] text-purple-400/40">{lo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(192,135,245,0.2), transparent)' }} />

              {/* Top predicted threats */}
              <div>
                <div className="font-mono text-[9px] text-purple-400/40 tracking-widest mb-2">TOP PREDICTED THREATS</div>
                <div className="space-y-2">
                  {predictedEvents
                    .filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH')
                    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
                    .slice(0, 5)
                    .map(evt => {
                      const sev = SEV_CONFIG[evt.severity];
                      return (
                        <button key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className="w-full text-left rounded-lg px-3 py-2 border flex items-center gap-3 transition-all hover:opacity-80"
                          style={{
                            background: sev.bg,
                            borderColor: `${sev.color}25`,
                          }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sev.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[10px] font-bold truncate" style={{ color: sev.color }}>
                              {evt.type.replace(/_/g, ' ')}
                            </div>
                            <div className="font-mono text-[9px] text-purple-400/60">
                              {evt.nodeName} · in {Math.round(evt.offsetMinutes)}m
                            </div>
                          </div>
                          <div className="font-mono text-[10px] text-purple-300 flex-shrink-0">
                            {evt.confidence}%
                          </div>
                        </button>
                      );
                    })}
                  {predictedEvents.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').length === 0 && (
                    <div className="text-center font-body italic text-purple-400/40 text-sm py-4">
                      No high-severity predictions in current window
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lore footer */}
        <div className="mt-8 text-center">
          <div className="h-px max-w-md mx-auto mb-4"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)' }} />
          <p className="font-body italic text-purple-400/30 text-sm">
            "Those who observe the past signals hold the key to predicting future anomalies."
          </p>
          <div className="font-mono text-[10px] text-purple-500/20 mt-1 tracking-widest">
            — Nexus Oracle Manual, Section IV
          </div>
        </div>
      </main>

      {/* Event detail panel (slide in from right) */}
      <SignalEventPanel
        event={selectedEvent}
        walletAddress={walletAddress}
        onClose={() => setSelectedEvent(null)}
        onLogged={handleLogged}
      />
    </div>
  );
}

// ── Utility sub-components ────────────────────────────────────────────────────

function SummaryCard({ label, value, color, pulse, subtitle }: {
  label: string; value: number; color: string;
  pulse?: boolean; subtitle?: string;
}) {
  return (
    <div className="rounded-xl px-3 py-2.5 border text-center"
      style={{
        background: 'rgba(7,17,51,0.9)',
        borderColor: `${color}20`,
      }}>
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: color }} />}
        <div className="font-mono text-lg font-bold leading-none" style={{ color }}>{value}</div>
      </div>
      <div className="font-mono text-[9px] text-purple-400/50 tracking-widest">{label}</div>
      {subtitle && <div className="font-mono text-[8px] text-purple-500/40 mt-0.5">{subtitle}</div>}
    </div>
  );
}

function FilterChip({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-[10px] px-2.5 py-1 rounded-lg transition-all tracking-wider"
      style={{
        background: active ? `${color}18` : 'rgba(123,46,200,0.06)',
        border: `1px solid ${active ? `${color}50` : 'rgba(123,46,200,0.15)'}`,
        color: active ? color : 'rgba(150,130,190,0.5)',
        boxShadow: active ? `0 0 10px ${color}20` : 'none',
      }}
    >
      {label}
    </button>
  );
}
