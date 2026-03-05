'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TimelineEvent, SEV_CONFIG, ERA_CONFIG, formatOffset } from '@/lib/timeMachineEngine';

interface SignalTimelineProps {
  events: TimelineEvent[];
  selectedId: string | null;
  onSelect: (event: TimelineEvent) => void;
  isLive?: boolean;
}

// px per minute on the timeline ruler
const PX_PER_MIN = 22;
// how many minutes of history to show left of NOW
const PAST_SPAN   = 90;
// how many minutes of future to show right of NOW
const FUTURE_SPAN = 45;

const TOTAL_WIDTH = (PAST_SPAN + FUTURE_SPAN) * PX_PER_MIN;
const NOW_X       = PAST_SPAN * PX_PER_MIN;

function minutesToX(offsetMinutes: number): number {
  return NOW_X + offsetMinutes * PX_PER_MIN;
}

const RULER_STEP_MINOR = 5;  // tick every 5 min
const RULER_STEP_MAJOR = 15; // label every 15 min

export default function SignalTimeline({ events, selectedId, onSelect, isLive = true }: SignalTimelineProps) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [nowTick, setNowTick] = useState(0);        // just to re-render NOW cursor
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; event: TimelineEvent } | null>(null);
  const isDragging = useRef(false);
  const dragStart  = useRef({ scrollLeft: 0, clientX: 0 });

  // Scroll to NOW on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    // centre the NOW marker in viewport
    const centreOffset = el.clientWidth / 2;
    el.scrollLeft = NOW_X - centreOffset;
  }, []);

  // Tick NOW cursor every second (for live feel)
  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setNowTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  // ── drag-to-scroll ───────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragStart.current = { scrollLeft: scrollRef.current.scrollLeft, clientX: e.clientX };
    scrollRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - dragStart.current.clientX;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  }, []);

  // ── ruler tick positions ─────────────────────────────────────────────────
  const ticks: { x: number; label: string | null; major: boolean }[] = [];
  for (let m = -PAST_SPAN; m <= FUTURE_SPAN; m += RULER_STEP_MINOR) {
    const isMajor = m % RULER_STEP_MAJOR === 0;
    let label: string | null = null;
    if (isMajor) {
      if (m === 0) label = 'NOW';
      else label = m > 0 ? `+${m}m` : `${m}m`;
    }
    ticks.push({ x: minutesToX(m), label, major: isMajor });
  }

  // Sort events into lanes by era for vertical stacking
  const pastEvents    = events.filter(e => e.era === 'PAST');
  const presentEvents = events.filter(e => e.era === 'PRESENT');
  const futureEvents  = events.filter(e => e.era === 'PREDICTED');

  return (
    <div className="relative select-none" style={{ userSelect: 'none' }}>
      {/* Zone labels above the scroll area */}
      <div className="flex mb-1 px-1">
        <ZoneLabel label="HISTORICAL" color={ERA_CONFIG.PAST.color} flex={PAST_SPAN} />
        <div className="w-px" />
        <ZoneLabel label="PREDICTED" color={ERA_CONFIG.PREDICTED.color} flex={FUTURE_SPAN} />
      </div>

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden rounded-xl border"
        style={{
          background: 'linear-gradient(180deg, rgba(6,14,44,0.98) 0%, rgba(14,6,32,0.98) 100%)',
          borderColor: 'rgba(123,46,200,0.25)',
          cursor: 'grab',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(123,46,200,0.3) transparent',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div style={{ width: TOTAL_WIDTH, position: 'relative', height: 240 }}>

          {/* Zone backgrounds */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Past zone */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: NOW_X,
              background: 'rgba(123,46,200,0.03)',
            }} />
            {/* Future zone */}
            <div style={{
              position: 'absolute', left: NOW_X, top: 0, bottom: 0, right: 0,
              background: 'rgba(192,135,245,0.04)',
            }}>
              {/* Diagonal stripes for predicted zone */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.06,
                backgroundImage: 'repeating-linear-gradient(45deg, #c087f5 0, #c087f5 1px, transparent 0, transparent 50%)',
                backgroundSize: '12px 12px',
              }} />
            </div>
          </div>

          {/* Vertical grid lines at major ticks */}
          {ticks.filter(t => t.major).map(t => (
            <div key={t.x} style={{
              position: 'absolute', left: t.x, top: 28, bottom: 0, width: 1,
              background: t.label === 'NOW' ? 'transparent' : 'rgba(123,46,200,0.1)',
            }} />
          ))}

          {/* Ruler row */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28 }}>
            {ticks.map(t => (
              <div key={t.x} style={{ position: 'absolute', left: t.x, top: 0 }}>
                {/* Tick mark */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: t.major ? 14 : 18,
                  width: 1,
                  height: t.major ? 10 : 6,
                  background: t.major ? 'rgba(123,46,200,0.5)' : 'rgba(123,46,200,0.25)',
                }} />
                {/* Label */}
                {t.label && (
                  <div style={{
                    position: 'absolute',
                    left: t.label === 'NOW' ? -18 : -16,
                    top: 0,
                    width: t.label === 'NOW' ? 36 : 32,
                    textAlign: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: t.label === 'NOW' ? 10 : 9,
                    fontWeight: t.label === 'NOW' ? 700 : 400,
                    color: t.label === 'NOW' ? '#fbbf24' : 'rgba(150,130,190,0.55)',
                    letterSpacing: '0.08em',
                  }}>
                    {t.label}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Horizontal axis line */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 114,
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(123,46,200,0.3) 5%, rgba(123,46,200,0.3) 95%, transparent 100%)',
          }} />

          {/* Lane labels */}
          <LaneLabel y={67}  label="PAST"    color={ERA_CONFIG.PAST.color} />
          <LaneLabel y={127} label="LIVE"    color={ERA_CONFIG.PRESENT.color} />
          <LaneLabel y={183} label="PREDICT" color={ERA_CONFIG.PREDICTED.color} />

          {/* Lane separator lines */}
          {[86, 142].map(y => (
            <div key={y} style={{
              position: 'absolute', left: 0, right: 0, top: y, height: 1,
              background: 'rgba(123,46,200,0.08)',
            }} />
          ))}

          {/* ── PAST events (lane y ≈ 48–84) ── */}
          {pastEvents.map(evt => (
            <EventMarker
              key={evt.id} event={evt} x={minutesToX(evt.offsetMinutes)} y={66}
              isSelected={selectedId === evt.id}
              isHovered={hoveredId === evt.id}
              onSelect={onSelect}
              onHover={id => setHoveredId(id)}
            />
          ))}

          {/* ── PRESENT events (lane y ≈ 107–141) ── */}
          {presentEvents.map(evt => (
            <EventMarker
              key={evt.id} event={evt} x={minutesToX(evt.offsetMinutes)} y={122}
              isSelected={selectedId === evt.id}
              isHovered={hoveredId === evt.id}
              onSelect={onSelect}
              onHover={id => setHoveredId(id)}
            />
          ))}

          {/* ── PREDICTED events (lane y ≈ 163–197) ── */}
          {futureEvents.map(evt => (
            <EventMarker
              key={evt.id} event={evt} x={minutesToX(evt.offsetMinutes)} y={178}
              isSelected={selectedId === evt.id}
              isHovered={hoveredId === evt.id}
              onSelect={onSelect}
              onHover={id => setHoveredId(id)}
              dashed
            />
          ))}

          {/* ── NOW cursor ── */}
          <NowCursor x={NOW_X} tick={nowTick} />

        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
        {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: SEV_CONFIG[s].color, boxShadow: `0 0 5px ${SEV_CONFIG[s].glow}` }} />
            <span className="font-mono text-[9px]" style={{ color: `${SEV_CONFIG[s].color}80` }}>{s}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-4">
          <div className="w-2.5 h-px border-t border-dashed border-purple-400/50" />
          <span className="font-mono text-[9px] text-purple-400/50">PREDICTED</span>
        </div>
        <div className="flex items-center gap-1.5 ml-1 text-purple-400/40 font-mono text-[9px]">
          ← drag to scroll →
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ZoneLabel({ label, color, flex }: { label: string; color: string; flex: number }) {
  return (
    <div className="flex items-center justify-center font-mono text-[9px] tracking-[0.2em] h-5 rounded"
      style={{
        flex,
        color: `${color}60`,
        borderBottom: `1px solid ${color}20`,
      }}>
      {label}
    </div>
  );
}

function LaneLabel({ y, label, color }: { y: number; label: string; color: string }) {
  return (
    <div style={{
      position: 'absolute',
      left: 8,
      top: y - 7,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: '0.18em',
      color: `${color}50`,
      pointerEvents: 'none',
    }}>
      {label}
    </div>
  );
}

interface MarkerProps {
  event: TimelineEvent;
  x: number;
  y: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (e: TimelineEvent) => void;
  onHover: (id: string | null) => void;
  dashed?: boolean;
}

function EventMarker({ event, x, y, isSelected, isHovered, onSelect, onHover, dashed }: MarkerProps) {
  const sev    = SEV_CONFIG[event.severity];
  const active = isSelected || isHovered;
  const R      = isSelected ? 7 : isHovered ? 6 : 5;
  const isCrit = event.severity === 'CRITICAL';

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 10,
        top: y - 10,
        width: 20,
        height: 20,
        cursor: 'pointer',
        zIndex: isSelected ? 30 : isHovered ? 20 : 10,
      }}
      onClick={e => { e.stopPropagation(); onSelect(event); }}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
    >
      <svg width="20" height="20" overflow="visible" style={{ overflow: 'visible' }}>
        {/* Stem line down to axis */}
        <line
          x1="10" y1="10"
          x2="10" y2={event.era === 'PAST' ? 48 : event.era === 'PRESENT' ? 2 : 36}
          stroke={sev.color}
          strokeWidth={active ? 1.5 : 1}
          strokeOpacity={dashed ? 0.4 : 0.3}
          strokeDasharray={dashed ? '3 2' : undefined}
        />

        {/* Outer pulse ring (animated for live / critical) */}
        {(active || isCrit || event.era === 'PRESENT') && (
          <circle cx="10" cy="10" r={R + 4} fill="none"
            stroke={sev.color} strokeWidth="0.8" opacity="0.4">
            {(isCrit || event.era === 'PRESENT') && (
              <>
                <animate attributeName="r" values={`${R + 2};${R + 8};${R + 2}`} dur={isCrit ? '1s' : '2s'} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur={isCrit ? '1s' : '2s'} repeatCount="indefinite" />
              </>
            )}
          </circle>
        )}

        {/* Selection ring */}
        {isSelected && (
          <circle cx="10" cy="10" r={R + 2} fill="none"
            stroke={sev.color} strokeWidth="1.5" opacity="0.8" />
        )}

        {/* Main dot */}
        <circle
          cx="10" cy="10" r={R}
          fill={active ? sev.color : sev.bg}
          stroke={sev.color}
          strokeWidth={dashed ? 1 : 1.5}
          strokeDasharray={dashed ? '3 2' : undefined}
          style={{
            filter: active ? `drop-shadow(0 0 6px ${sev.glow})` : undefined,
            transition: 'r 0.15s ease, fill 0.15s ease',
          }}
        />

        {/* Inner dot for selected */}
        {isSelected && (
          <circle cx="10" cy="10" r="2.5" fill="white" opacity="0.9" />
        )}
      </svg>

      {/* Hover tooltip */}
      {isHovered && !isSelected && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '100%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          background: 'rgba(4,13,36,0.98)',
          border: `1px solid ${sev.color}50`,
          borderRadius: 8,
          padding: '5px 8px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 999,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 10px ${sev.glow}`,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: sev.color, fontWeight: 700 }}>
            {event.type.replace(/_/g, ' ')}
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(200,180,240,0.7)', marginTop: 1 }}>
            {event.nodeName} · {formatOffset(event.offsetMinutes)}
          </div>
          {event.era === 'PREDICTED' && event.confidence !== undefined && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#c087f5', marginTop: 1 }}>
              {event.confidence}% confidence
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: -1, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${sev.color}50`,
          }} />
        </div>
      )}
    </div>
  );
}

function NowCursor({ x, tick }: { x: number; tick: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: 0, bottom: 0, zIndex: 40, pointerEvents: 'none' }}>
      {/* Glow beam */}
      <div style={{
        position: 'absolute',
        left: -8, top: 24, bottom: 0, width: 16,
        background: 'linear-gradient(180deg, rgba(251,191,36,0.15), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Main cursor line */}
      <div style={{
        position: 'absolute',
        left: 0, top: 24, bottom: 0, width: 1,
        background: 'linear-gradient(180deg, #fbbf24, rgba(251,191,36,0.3))',
        boxShadow: '0 0 8px rgba(251,191,36,0.6)',
      }} />

      {/* Top diamond */}
      <div style={{
        position: 'absolute',
        left: -6, top: 22,
        width: 12, height: 12,
        background: '#fbbf24',
        transform: 'rotate(45deg)',
        boxShadow: '0 0 12px rgba(251,191,36,0.8)',
      }} />

      {/* NOW label */}
      <div style={{
        position: 'absolute',
        left: -18, top: 4,
        width: 36, textAlign: 'center',
        fontFamily: 'Cinzel, serif',
        fontSize: 8,
        fontWeight: 700,
        color: '#fbbf24',
        letterSpacing: '0.1em',
        textShadow: '0 0 8px rgba(251,191,36,0.8)',
      }}>
        NOW
      </div>
    </div>
  );
}
