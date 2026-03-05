'use client';

import { useEffect, useRef, useState } from 'react';
import { NodeState } from '@/lib/signalEngine';

interface SignalNetworkMapProps {
  nodes: NodeState[];
  className?: string;
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  ONLINE:     { fill: 'rgba(0,230,118,0.15)',  stroke: '#00e676', glow: 'rgba(0,230,118,0.5)' },
  PROCESSING: { fill: 'rgba(0,229,255,0.15)',  stroke: '#00e5ff', glow: 'rgba(0,229,255,0.5)' },
  ANOMALY:    { fill: 'rgba(255,23,68,0.2)',   stroke: '#ff1744', glow: 'rgba(255,23,68,0.6)' },
  OFFLINE:    { fill: 'rgba(80,60,100,0.15)',  stroke: '#4a3870', glow: 'rgba(80,60,100,0.3)' },
};

// Center node is at 50%, 50% in SVG viewBox 100x100
const CENTER = { x: 50, y: 52 };

export default function SignalNetworkMap({ nodes, className = '' }: SignalNetworkMapProps) {
  const [pulses, setPulses] = useState<{ id: string; x: number; y: number; active: boolean }[]>([]);
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      // Spawn pulse particles along edges
      const newPulse = nodes[tickRef.current % nodes.length];
      if (newPulse && newPulse.status !== 'OFFLINE') {
        setPulses(prev => [
          ...prev.filter(p => p.active),
          { id: `${newPulse.id}_${tickRef.current}`, x: newPulse.x, y: newPulse.y, active: true }
        ].slice(-8));
      }
    }, 600);
    return () => clearInterval(interval);
  }, [nodes]);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 105"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Animated gradient for lines */}
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(123,46,200,0)" />
            <stop offset="50%" stopColor="rgba(0,229,255,0.6)" />
            <stop offset="100%" stopColor="rgba(123,46,200,0)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines (subtle) */}
        {[20, 40, 60, 80].map(v => (
          <line key={`h${v}`} x1="0" y1={v} x2="100" y2={v}
            stroke="rgba(123,46,200,0.06)" strokeWidth="0.3" />
        ))}
        {[20, 40, 60, 80].map(v => (
          <line key={`vl${v}`} x1={v} y1="0" x2={v} y2="100"
            stroke="rgba(123,46,200,0.06)" strokeWidth="0.3" />
        ))}

        {/* Connection lines from center to each node */}
        {nodes.map((node) => {
          const cfg = STATUS_COLORS[node.status] || STATUS_COLORS.ONLINE;
          return (
            <g key={`line_${node.id}`}>
              {/* Base line */}
              <line
                x1={CENTER.x} y1={CENTER.y}
                x2={node.x} y2={node.y}
                stroke="rgba(123,46,200,0.2)"
                strokeWidth="0.4"
              />
              {/* Animated signal line */}
              <line
                x1={CENTER.x} y1={CENTER.y}
                x2={node.x} y2={node.y}
                stroke={cfg.stroke}
                strokeWidth="0.5"
                strokeOpacity="0.5"
                strokeDasharray="3 4"
                style={{
                  animation: `dashMove ${node.status === 'ANOMALY' ? '0.8s' : '2s'} linear infinite`,
                }}
              />
            </g>
          );
        })}

        {/* Pulse particles traveling along edges */}
        {pulses.map(pulse => {
          const node = nodes.find(n => pulse.id.startsWith(n.id));
          if (!node) return null;
          const cfg = STATUS_COLORS[node.status] || STATUS_COLORS.ONLINE;
          return (
            <circle key={pulse.id} r="1.2" fill={cfg.stroke} filter="url(#glow)"
              opacity="0.9">
              <animateMotion
                dur="1.2s" fill="freeze" repeatCount="1"
                path={`M${CENTER.x},${CENTER.y} L${node.x},${node.y}`}
              />
              <animate attributeName="opacity" values="0;1;0" dur="1.2s" fill="freeze" />
            </circle>
          );
        })}

        {/* Outer nodes */}
        {nodes.map((node) => {
          const cfg = STATUS_COLORS[node.status] || STATUS_COLORS.ONLINE;
          const isAnomaly = node.status === 'ANOMALY';

          return (
            <g key={`node_${node.id}`} filter={isAnomaly ? 'url(#strongGlow)' : 'url(#glow)'}>
              {/* Pulse ring for anomaly */}
              {isAnomaly && (
                <circle cx={node.x} cy={node.y} r="6" fill="none"
                  stroke={cfg.stroke} strokeWidth="0.5" opacity="0.4">
                  <animate attributeName="r" values="5;10;5" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Node processing ring */}
              {node.status === 'PROCESSING' && (
                <circle cx={node.x} cy={node.y} r="6" fill="none"
                  stroke={cfg.stroke} strokeWidth="0.4" opacity="0.3"
                  strokeDasharray="4 2">
                  <animateTransform attributeName="transform" type="rotate"
                    values={`0 ${node.x} ${node.y};360 ${node.x} ${node.y}`}
                    dur="3s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Node circle */}
              <circle
                cx={node.x} cy={node.y} r="5"
                fill={cfg.fill}
                stroke={cfg.stroke}
                strokeWidth="0.8"
              />

              {/* Status dot */}
              <circle
                cx={node.x} cy={node.y} r="1.5"
                fill={cfg.stroke}
              >
                {node.status !== 'OFFLINE' && (
                  <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                )}
              </circle>

              {/* Node label */}
              <text
                x={node.x}
                y={node.y + 9}
                textAnchor="middle"
                fontSize="3.5"
                fontFamily="Rajdhani, sans-serif"
                fontWeight="600"
                fill={cfg.stroke}
                opacity="0.9"
              >
                {node.name}
              </text>

              {/* Status label */}
              <text
                x={node.x}
                y={node.y + 12.5}
                textAnchor="middle"
                fontSize="2.8"
                fontFamily="JetBrains Mono, monospace"
                fill={cfg.stroke}
                opacity="0.6"
              >
                {node.status}
              </text>

              {/* Latency badge */}
              <text
                x={node.x}
                y={node.y - 7}
                textAnchor="middle"
                fontSize="2.5"
                fontFamily="JetBrains Mono, monospace"
                fill="rgba(200,180,240,0.7)"
              >
                {node.latency.toFixed(0)}ms
              </text>
            </g>
          );
        })}

        {/* Center: AI Signal Engine */}
        <g filter="url(#strongGlow)">
          {/* Outer pulse rings */}
          <circle cx={CENTER.x} cy={CENTER.y} r="10" fill="none"
            stroke="rgba(245,158,11,0.2)" strokeWidth="0.5">
            <animate attributeName="r" values="10;16;10" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={CENTER.x} cy={CENTER.y} r="8" fill="none"
            stroke="rgba(245,158,11,0.3)" strokeWidth="0.4" strokeDasharray="5 3">
            <animateTransform attributeName="transform" type="rotate"
              values={`0 ${CENTER.x} ${CENTER.y};360 ${CENTER.x} ${CENTER.y}`}
              dur="8s" repeatCount="indefinite" />
          </circle>

          {/* Center node body */}
          <circle cx={CENTER.x} cy={CENTER.y} r="7"
            fill="rgba(245,158,11,0.1)"
            stroke="rgba(245,158,11,0.8)"
            strokeWidth="0.8"
          />
          {/* Inner dot */}
          <circle cx={CENTER.x} cy={CENTER.y} r="2.5" fill="#fbbf24">
            <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
          </circle>

          {/* Label */}
          <text x={CENTER.x} y={CENTER.y + 11} textAnchor="middle"
            fontSize="3.8" fontFamily="Cinzel, serif" fontWeight="700" fill="#fbbf24" opacity="0.9">
            AI SIGNAL ENGINE
          </text>
        </g>

        <style>{`
          @keyframes dashMove {
            to { stroke-dashoffset: -28; }
          }
        `}</style>
      </svg>
    </div>
  );
}
