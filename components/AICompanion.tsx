'use client';

import { useState, useEffect } from 'react';

interface AICompanionProps {
  insights: string[];
  isAnalyzing?: boolean;
}

export default function AICompanion({ insights, isAnalyzing = false }: AICompanionProps) {
  const [visibleInsights, setVisibleInsights] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (insights.length === 0) return;
    setVisibleInsights([]);
    setCurrentIdx(0);

    const timer = setInterval(() => {
      setCurrentIdx(prev => {
        if (prev < insights.length) {
          setVisibleInsights(vis => [...vis, insights[prev]]);
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 600);

    return () => clearInterval(timer);
  }, [insights]);

  return (
    <div className="arcane-card rounded-xl overflow-hidden border border-purple-500/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/60 to-arcane-800/60 px-4 py-3 border-b border-purple-500/20 flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-yellow-500 flex items-center justify-center text-sm">
            🔮
          </div>
          {isAnalyzing && (
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/60 animate-ping" />
          )}
        </div>
        <div>
          <div className="font-display text-xs text-yellow-400 tracking-wider">ORACLE COMPANION</div>
          <div className="font-ui text-xs text-purple-300/70">Arcane Signal Analysis</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="font-mono text-[10px] text-purple-300">{isAnalyzing ? 'ANALYZING' : 'ACTIVE'}</span>
        </div>
      </div>

      {/* Oracle content */}
      <div className="p-4 min-h-[120px]">
        {isAnalyzing ? (
          <div className="flex items-center gap-3 text-purple-300">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="font-body italic text-sm">Consulting the rune matrix...</span>
          </div>
        ) : visibleInsights.length > 0 ? (
          <div className="space-y-2">
            {visibleInsights.map((insight, i) => (
              <div
                key={i}
                className="font-body text-sm text-purple-200 leading-relaxed pl-3 border-l-2 border-yellow-500/40"
                style={{
                  animation: 'fadeInLeft 0.4s ease forwards',
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                {insight}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-2xl mb-2 animate-pulse">🔮</div>
            <p className="font-body italic text-purple-300/60 text-sm">
              The oracle awaits your signal...
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
