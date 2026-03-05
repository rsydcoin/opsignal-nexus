'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  generateSignalTraffic, generateLatency, generateAnomalyBarData,
  SignalDataPoint,
} from '@/lib/signalEngine';

interface LiveSignalDashboardProps {
  tick: number;
}

const CHART_STYLE = {
  background: 'transparent',
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
};

function CustomTooltip({ active, payload, label, valueLabel, color }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
  valueLabel: string; color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs font-mono border"
      style={{ background: 'rgba(4,13,36,0.97)', borderColor: `${color}40` }}>
      <div style={{ color: 'rgba(180,160,220,0.7)' }}>{label}</div>
      <div style={{ color }}>{valueLabel}: <span className="font-bold">{payload[0].value}</span></div>
    </div>
  );
}

export default function LiveSignalDashboard({ tick }: LiveSignalDashboardProps) {
  const [signalHistory, setSignalHistory] = useState<SignalDataPoint[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<SignalDataPoint[]>([]);
  const [anomalyBarData, setAnomalyBarData] = useState<{ label: string; anomalies: number; resolved: number }[]>([]);
  const initialized = useRef(false);

  // Initialize with seed data
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let sHist: SignalDataPoint[] = [];
    let lHist: SignalDataPoint[] = [];
    for (let i = 0; i < 20; i++) {
      sHist = generateSignalTraffic(sHist, i);
      lHist = generateLatency(lHist, i);
    }
    setSignalHistory(sHist);
    setLatencyHistory(lHist);
    setAnomalyBarData(generateAnomalyBarData(0));
  }, []);

  // Update on each tick
  useEffect(() => {
    if (!initialized.current) return;
    setSignalHistory(prev => generateSignalTraffic(prev, tick));
    setLatencyHistory(prev => generateLatency(prev, tick));
    if (tick % 5 === 0) setAnomalyBarData(generateAnomalyBarData(tick));
  }, [tick]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Signal Activity */}
      <ChartCard title="Signal Activity" subtitle="req/s" indicator="#00e5ff" live>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={signalHistory} style={CHART_STYLE}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,46,200,0.1)" />
            <XAxis dataKey="label" tick={{ fill: 'rgba(150,130,190,0.6)', fontSize: 9 }}
              tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'rgba(150,130,190,0.6)', fontSize: 9 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<CustomTooltip valueLabel="Signals" color="#00e5ff" />} />
            <Line type="monotone" dataKey="value" stroke="#00e5ff" strokeWidth={1.5}
              dot={false} activeDot={{ r: 3, fill: '#00e5ff' }}
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.5))' }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Network Latency */}
      <ChartCard title="Network Latency" subtitle="ms" indicator="#fbbf24" live>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={latencyHistory} style={CHART_STYLE}>
            <defs>
              <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,46,200,0.1)" />
            <XAxis dataKey="label" tick={{ fill: 'rgba(150,130,190,0.6)', fontSize: 9 }}
              tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'rgba(150,130,190,0.6)', fontSize: 9 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<CustomTooltip valueLabel="ms" color="#fbbf24" />} />
            <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={1.5}
              fill="url(#latencyGrad)" dot={false}
              style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Anomaly Events */}
      <ChartCard title="Anomaly Events" subtitle="last 7h" indicator="#ff1744">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={anomalyBarData} style={CHART_STYLE} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(123,46,200,0.1)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'rgba(150,130,190,0.6)', fontSize: 9 }}
              tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'rgba(150,130,190,0.6)', fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
            <Tooltip
              contentStyle={{ background: 'rgba(4,13,36,0.97)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: 8, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              labelStyle={{ color: 'rgba(180,160,220,0.7)' }}
            />
            <Bar dataKey="anomalies" fill="rgba(255,23,68,0.6)" radius={[2, 2, 0, 0]} name="Detected" />
            <Bar dataKey="resolved" fill="rgba(0,230,118,0.5)" radius={[2, 2, 0, 0]} name="Resolved" />
            <Legend wrapperStyle={{ fontSize: 9, color: 'rgba(150,130,190,0.7)', paddingTop: 4 }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, indicator, live, children }: {
  title: string; subtitle: string; indicator: string; live?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(7,17,51,0.95), rgba(18,8,36,0.95))', borderColor: `${indicator}25` }}>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <div className="font-display text-xs tracking-widest font-bold" style={{ color: indicator }}>{title}</div>
          <div className="font-mono text-[10px] text-purple-400/60">{subtitle}</div>
        </div>
        {live && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: indicator }} />
            <span className="font-mono text-[10px]" style={{ color: indicator }}>LIVE</span>
          </div>
        )}
      </div>
      <div className="px-1 pb-3">{children}</div>
    </div>
  );
}
