'use client';

import { useState } from 'react';
import { sendSignalTip, saveObserverXP } from '@/lib/opnetSignals';
import { AnomalyEvent } from '@/lib/signalEngine';

interface SignalTipProps {
  anomaly: AnomalyEvent;
  walletAddress: string;
  onTipSent?: (xp: number) => void;
}

const TIP_AMOUNTS = [0.001, 0.005, 0.01, 0.05];

export default function SignalTip({ anomaly, walletAddress, onTipSent }: SignalTipProps) {
  const [selectedAmount, setSelectedAmount] = useState(TIP_AMOUNTS[1]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');

  const handleTip = async () => {
    if (status === 'sending') return;
    setStatus('sending');

    try {
      const result = await sendSignalTip(anomaly.id, selectedAmount, walletAddress);
      setTxHash(result.txHash);
      const xpEarned = 15;
      saveObserverXP(walletAddress, xpEarned);
      setStatus('success');
      onTipSent?.(xpEarned);
    } catch {
      setStatus('error');
    }
  };

  const severityColor: Record<string, string> = {
    LOW: '#00e676', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#ff1744',
  };
  const color = severityColor[anomaly.severity] || '#c087f5';

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        background: 'rgba(7,17,51,0.95)',
        borderColor: `${color}35`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-xs" style={{ color }} >
            {anomaly.type.replace(/_/g, ' ')}
          </div>
          <div className="font-ui text-[11px] text-purple-400 mt-0.5">
            {anomaly.nodeName} · <span style={{ color }}>{anomaly.severity}</span>
          </div>
        </div>
        <div className="font-mono text-[10px] text-purple-500">
          {new Date(anomaly.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {status === 'success' ? (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/30 p-3 text-center">
          <div className="font-display text-emerald-400 text-xs tracking-widest mb-1">✓ TIP SENT</div>
          <div className="font-mono text-[10px] text-emerald-300/60 break-all">
            {txHash.slice(0, 20)}...
          </div>
          <div className="font-mono text-[10px] text-yellow-400 mt-1">+15 XP earned</div>
        </div>
      ) : (
        <>
          {/* Amount selector */}
          <div className="flex gap-1.5 mb-3">
            {TIP_AMOUNTS.map(amt => (
              <button key={amt}
                onClick={() => setSelectedAmount(amt)}
                className="flex-1 py-1 rounded text-xs font-mono transition-all"
                style={{
                  background: selectedAmount === amt ? `${color}20` : 'rgba(123,46,200,0.1)',
                  border: `1px solid ${selectedAmount === amt ? color : 'rgba(123,46,200,0.2)'}`,
                  color: selectedAmount === amt ? color : '#8b5cf6',
                }}
              >
                {amt}Ξ
              </button>
            ))}
          </div>

          <button
            onClick={handleTip}
            disabled={status === 'sending'}
            className="w-full py-2 rounded-lg font-display text-xs tracking-widest transition-all disabled:opacity-50"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}50`,
              color,
            }}
          >
            {status === 'sending' ? (
              <span className="processing-blink">⚡ SENDING...</span>
            ) : (
              `⚡ TIP ${selectedAmount}Ξ`
            )}
          </button>
        </>
      )}
    </div>
  );
}
