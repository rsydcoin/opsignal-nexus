'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import HUD from '@/components/HUD';
import SignalCard from '@/components/SignalCard';
import { useWallet } from '@/lib/walletContext';
import { generateAnomalyEvents, AnomalyEvent } from '@/lib/signalEngine';
import { analyzeSignal, classifyRarity, RARITY_CONFIG } from '@/lib/aiSignals';
import { saveObserverXP } from '@/lib/opnetSignals';
import Link from 'next/link';

type FilterSev = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type FilterRarity = 'ALL' | 'COMMON' | 'RARE' | 'CRITICAL';

const SEV_COLOR: Record<string, string> = {
  LOW: '#00e676', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#ff1744',
};

// Enrich an AnomalyEvent with stable mock reward amounts
const MOCK_REWARD_BASE: Record<string, number> = {
  CRITICAL: 42, HIGH: 18, MEDIUM: 8, LOW: 2,
};

interface TimelineEntry {
  event: AnomalyEvent;
  arrivalTick: number;
  mockRewardBase: number;
}

export default function TimelinePage() {
  const { walletAddress } = useWallet();

  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [sevFilter, setSevFilter] = useState<FilterSev>('ALL');
  const [rarityFilter, setRarityFilter] = useState<FilterRarity>('ALL');
  const [totalXP, setTotalXP] = useState(0);
  const tickRef = useRef(0);
  const anomalyBuf = useRef<AnomalyEvent[]>([]);

  // Live feed — produce one tick every 2 s, keep last 40 events on timeline
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      const t = tickRef.current;
      anomalyBuf.current = generateAnomalyEvents(anomalyBuf.current, t);

      setEntries(prev => {
        // New events not already in timeline
        const existingIds = new Set(prev.map(e => e.event.id));
        const newEvents = anomalyBuf.current.filter(a => !existingIds.has(a.id));
        if (newEvents.length === 0) return prev;

        const added: TimelineEntry[] = newEvents.map(evt => ({
          event: evt,
          arrivalTick: t,
          mockRewardBase: MOCK_REWARD_BASE[evt.severity] ?? 4,
        }));

        return [...added, ...prev].slice(0, 60);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleRewardSent = (xp: number) => {
    setTotalXP(prev => prev + xp);
    if (walletAddress) saveObserverXP(walletAddress, xp);
  };

  const filtered = useMemo(() => entries.filter(e => {
    if (sevFilter !== 'ALL' && e.event.severity !== sevFilter) return false;
    if (rarityFilter !== 'ALL') {
      const analysis = analyzeSignal({
        id: e.event.id, type: e.event.type, severity: e.event.severity,
        nodeId: e.event.nodeId, timestamp: e.event.timestamp,
      });
      if (classifyRarity(e.event.severity, analysis.confidenceScore) !== rarityFilter) return false;
    }
    return true;
  }), [entries, sevFilter, rarityFilter]);

  // Group by minute for timeline headers
  const grouped = useMemo(() => {
    const groups: { minuteKey: string; timeLabel: string; items: TimelineEntry[] }[] = [];
    let currentKey = '';
    for (const entry of filtered) {
      const d = new Date(entry.event.timestamp);
      const key = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (key !== currentKey) {
        currentKey = key;
        groups.push({ minuteKey: key, timeLabel: key, items: [entry] });
      } else {
        groups[groups.length - 1].items.push(entry);
      }
    }
    return groups;
  }, [filtered]);

  const critCount = entries.filter(e => e.event.severity === 'CRITICAL').length;
  const highCount = entries.filter(e => e.event.severity === 'HIGH').length;

  return (
    <div className="min-h-screen bg-[#020818]">
      <HUD />

      {/* Grid bg */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(123,46,200,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(123,46,200,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-ui text-sm text-purple-400 hover:text-yellow-400 transition-colors">← Hub</Link>
            <div>
              <div className="font-display text-xl text-yellow-400 tracking-widest">📋 SIGNAL TIMELINE</div>
              <div className="font-mono text-[10px] text-purple-400/50 tracking-wider">
                Live chronological feed · {entries.length} signals
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* XP earned this session */}
            {totalXP > 0 && (
              <div className="font-mono text-xs px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', color: '#00e676' }}>
                +{totalXP} XP earned
              </div>
            )}
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border"
              style={{ background: 'rgba(0,229,255,0.05)', borderColor: 'rgba(0,229,255,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[10px] text-cyan-400">LIVE</span>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <SumCard label="TOTAL"    value={entries.length}  color="#c087f5" />
          <SumCard label="CRITICAL" value={critCount}       color="#ff1744" pulse={critCount > 0} />
          <SumCard label="HIGH"     value={highCount}       color="#fb923c" />
          <SumCard label="XP"       value={totalXP}         color="#00e676" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="font-mono text-[10px] text-purple-400/50 tracking-widest">SEV</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as FilterSev[]).map(f => (
            <FilterPill key={f} label={f} active={sevFilter === f}
              color={f === 'ALL' ? '#c087f5' : SEV_COLOR[f]}
              onClick={() => setSevFilter(f)} />
          ))}

          <div className="w-px h-4 bg-purple-500/20 mx-1" />

          <span className="font-mono text-[10px] text-purple-400/50 tracking-widest">RARITY</span>
          {(['ALL', 'CRITICAL', 'RARE', 'COMMON'] as FilterRarity[]).map(f => (
            <FilterPill key={f} label={f} active={rarityFilter === f}
              color={f === 'ALL' ? '#c087f5' : RARITY_CONFIG[f as keyof typeof RARITY_CONFIG]?.color ?? '#c087f5'}
              onClick={() => setRarityFilter(f)} />
          ))}
        </div>

        {/* ── Vertical timeline ── */}
        {grouped.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📡</div>
            <div className="font-display text-yellow-400/60 tracking-widest mb-2">AWAITING SIGNALS…</div>
            <div className="font-mono text-xs text-purple-400/40">Live feed populates every 2 seconds</div>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical spine */}
            <div className="absolute left-[42px] top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(123,46,200,0.3) 5%, rgba(123,46,200,0.3) 95%, transparent)' }} />

            {grouped.map((group, gi) => (
              <div key={group.minuteKey} className="mb-6">
                {/* Time label */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative z-10 w-[84px] flex-shrink-0">
                    <div className="font-mono text-sm font-bold text-yellow-400 text-right pr-2">
                      {group.timeLabel}
                    </div>
                    {/* Axis connector */}
                    <div className="absolute right-[-1px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-400"
                      style={{ boxShadow: '0 0 8px rgba(251,191,36,0.6)' }} />
                  </div>
                  <div className="flex-1 h-px" style={{ background: 'rgba(251,191,36,0.15)' }} />
                  <div className="font-mono text-[9px] text-purple-400/40 flex-shrink-0">
                    {group.items.length} signal{group.items.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Events in this minute */}
                <div className="pl-[100px] space-y-3">
                  {group.items.map((entry, ei) => (
                    <div key={entry.event.id} className="relative">
                      {/* Connector dot */}
                      <div className="absolute left-[-58px] top-4 w-2 h-2 rounded-full border"
                        style={{
                          background: SEV_COLOR[entry.event.severity] + '40',
                          borderColor: SEV_COLOR[entry.event.severity],
                          boxShadow: entry.event.severity === 'CRITICAL' ? `0 0 6px ${SEV_COLOR.CRITICAL}` : 'none',
                        }} />
                      {/* Horizontal connector */}
                      <div className="absolute left-[-54px] top-[19px] w-[38px] h-px"
                        style={{ background: `${SEV_COLOR[entry.event.severity]}30` }} />

                      {/* Second timestamp */}
                      <div className="absolute left-[-96px] top-3.5 font-mono text-[9px] text-purple-400/30 w-10 text-right">
                        {new Date(entry.event.timestamp).toLocaleTimeString('en-US', {
                          second: '2-digit', hour12: false,
                        }).slice(-2)}s
                      </div>

                      <SignalCard
                        signal={entry.event}
                        mockRewardBase={entry.mockRewardBase}
                        onRewardSent={handleRewardSent}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Live indicator at bottom */}
            <div className="flex items-center gap-3 pl-[86px] mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-[10px] text-cyan-400/60">Listening for new signals…</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <div className="h-px max-w-xs mx-auto mb-3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent)' }} />
          <p className="font-body italic text-purple-400/25 text-xs">
            "Every anomaly leaves a trace. The timeline never forgets."
          </p>
        </div>
      </main>
    </div>
  );
}

function SumCard({ label, value, color, pulse }: { label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <div className="rounded-xl px-2 py-2 border text-center"
      style={{ background: 'rgba(7,17,51,0.9)', borderColor: `${color}20` }}>
      <div className="flex items-center justify-center gap-1">
        {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: color }} />}
        <span className="font-mono text-base font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="font-mono text-[9px] text-purple-400/50 tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function FilterPill({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="font-mono text-[10px] px-2 py-1 rounded-lg transition-all"
      style={{
        background: active ? `${color}15` : 'rgba(123,46,200,0.06)',
        border: `1px solid ${active ? `${color}45` : 'rgba(123,46,200,0.15)'}`,
        color: active ? color : 'rgba(150,130,190,0.5)',
        boxShadow: active ? `0 0 8px ${color}20` : 'none',
      }}>
      {label}
    </button>
  );
}
