'use client';

import { SignalPrediction } from '@/lib/signalEngine';

interface SignalPredictionPanelProps {
  prediction: SignalPrediction;
  isLive?: boolean;
}

export default function SignalPredictionPanel({ prediction, isLive = true }: SignalPredictionPanelProps) {
  const { anomalyProbability, highRiskNode, stabilityScore, nextEventEta, confidence, threatVector } = prediction;

  const stabilityColor = stabilityScore >= 75 ? '#00e676' : stabilityScore >= 50 ? '#fbbf24' : '#ff1744';
  const anomalyColor = anomalyProbability >= 70 ? '#ff1744' : anomalyProbability >= 45 ? '#fb923c' : '#fbbf24';

  return (
    <div className="rounded-xl border overflow-hidden h-full"
      style={{ background: 'linear-gradient(135deg, rgba(7,17,51,0.97), rgba(26,10,46,0.97))', borderColor: 'rgba(123,46,200,0.35)' }}>

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(123,46,200,0.2)', background: 'rgba(123,46,200,0.08)' }}>
        <div>
          <div className="font-display text-xs tracking-widest text-purple-300 font-bold">AI SIGNAL PREDICTION</div>
          <div className="font-mono text-[10px] text-purple-400/50 mt-0.5">Nexus Oracle · {confidence}% confidence</div>
        </div>
        <div className="flex items-center gap-1.5">
          {isLive && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
          <span className="font-mono text-[10px] text-purple-400/70">🔮 ACTIVE</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Anomaly Probability */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-ui text-xs text-purple-300/70 tracking-wider">NEXT ANOMALY PROBABILITY</span>
            <span className="font-mono text-xl font-bold" style={{ color: anomalyColor }}>
              {anomalyProbability}%
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(123,46,200,0.15)' }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${anomalyProbability}%`,
                background: `linear-gradient(90deg, ${anomalyColor}80, ${anomalyColor})`,
                boxShadow: `0 0 8px ${anomalyColor}60`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[9px] text-emerald-400/60">STABLE</span>
            <span className="font-mono text-[9px] text-red-400/60">CRITICAL</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(123,46,200,0.25), transparent)' }} />

        {/* Key metrics */}
        <div className="space-y-3">
          <MetricRow
            label="HIGH RISK NODE"
            value={highRiskNode}
            color="#ff6b6b"
            icon="⚠"
          />
          <MetricRow
            label="SYSTEM STABILITY"
            value={`${stabilityScore.toFixed(0)}%`}
            color={stabilityColor}
            icon="🛡"
            subValue={
              <div className="w-16 h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(123,46,200,0.15)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${stabilityScore}%`,
                  background: stabilityColor,
                  transition: 'width 0.8s ease',
                }} />
              </div>
            }
          />
          <MetricRow
            label="NEXT EVENT ETA"
            value={`~${nextEventEta}s`}
            color="#00e5ff"
            icon="⏱"
          />
          <MetricRow
            label="THREAT VECTOR"
            value={threatVector}
            color="#c087f5"
            icon="🎯"
            small
          />
        </div>

        {/* Confidence bar */}
        <div className="rounded-lg p-2.5 border" style={{ background: 'rgba(123,46,200,0.06)', borderColor: 'rgba(123,46,200,0.2)' }}>
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-[10px] text-purple-400/60">ORACLE CONFIDENCE</span>
            <span className="font-mono text-[10px] text-purple-300">{confidence}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(123,46,200,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${confidence}%`,
                background: 'linear-gradient(90deg, #7b2ec8, #c087f5)',
              }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color, icon, subValue, small }: {
  label: string; value: string; color: string; icon: string;
  subValue?: React.ReactNode; small?: boolean;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <div>
          <div className="font-mono text-[9px] text-purple-400/50 tracking-wider">{label}</div>
          {subValue}
        </div>
      </div>
      <div className="font-mono text-right" style={{
        color,
        fontSize: small ? '10px' : '13px',
        fontWeight: 'bold',
        maxWidth: '120px',
        wordBreak: 'break-word',
        textAlign: 'right',
      }}>
        {value}
      </div>
    </div>
  );
}
