'use client';

/**
 * components/MarketTicker.tsx
 *
 * Live crypto price strip powered by lib/market.ts.
 * Auto-refreshes every 60 s.  Matches the Observatory's existing
 * dark-card / font-mono design system — no new Tailwind classes.
 *
 * Usage:
 *   <MarketTicker />            — full six-coin grid (default)
 *   <MarketTicker compact />    — single scrolling row for smaller contexts
 */

import {
  useMarketData,
  getTrackedCoins,
  formatPrice,
  formatChange,
  formatMarketCap,
  changeColor,
  COIN_SYMBOL,
  COIN_COLOR,
  TRACKED_IDS,
  TrackedId,
  MarketResult,
} from '@/lib/market';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface MarketTickerProps {
  /** compact = single horizontal row instead of the 6-card grid */
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card — shown while the first fetch is in-flight
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-lg px-3 py-2 border animate-pulse"
      style={{ background: 'rgba(7,17,51,0.9)', borderColor: 'rgba(123,46,200,0.15)' }}
    >
      <div className="h-2 w-10 rounded mb-2" style={{ background: 'rgba(123,46,200,0.2)' }} />
      <div className="h-3 w-20 rounded mb-1" style={{ background: 'rgba(123,46,200,0.15)' }} />
      <div className="h-2 w-14 rounded"     style={{ background: 'rgba(123,46,200,0.1)' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────────────────────

function ErrorBanner() {
  return (
    <div
      className="rounded-lg px-4 py-3 border col-span-full flex items-center gap-2"
      style={{ background: 'rgba(255,23,68,0.05)', borderColor: 'rgba(255,23,68,0.2)' }}
    >
      <span className="text-base">⚠</span>
      <span className="font-mono text-[10px] text-red-400/70">
        Market data temporarily unavailable — retrying in 60 s
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full grid card (one per coin)
// ─────────────────────────────────────────────────────────────────────────────

interface CoinCardProps {
  id: TrackedId;
  price: number;
  change24h: number;
  marketCap: number;
  volume: number;
  rank: number;
}

function CoinCard({ id, price, change24h, marketCap, volume, rank }: CoinCardProps) {
  const symbol  = COIN_SYMBOL[id];
  const color   = COIN_COLOR[id];
  const chColor = changeColor(change24h);
  const chLabel = formatChange(change24h);
  const isPos   = change24h >= 0;

  return (
    <div
      className="rounded-lg px-3 py-2.5 border relative overflow-hidden transition-all duration-200"
      style={{
        background:   'rgba(7,17,51,0.95)',
        borderColor:  `${color}25`,
      }}
    >
      {/* Subtle left-side accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg"
        style={{ background: color, opacity: 0.7 }}
      />

      {/* Rank + symbol row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="font-mono text-[8px] px-1 rounded font-bold"
            style={{ background: `${color}15`, color }}
          >
            #{rank}
          </span>
          <span className="font-mono text-xs font-bold" style={{ color }}>
            {symbol}
          </span>
        </div>
        {/* 24h change badge */}
        <span
          className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${chColor}12`, color: chColor }}
        >
          {isPos ? '▲' : '▼'} {chLabel}
        </span>
      </div>

      {/* Price */}
      <div className="font-mono text-sm font-bold mb-1" style={{ color }}>
        {formatPrice(price)}
      </div>

      {/* Cap + volume */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] text-purple-400/50">
          MCap {formatMarketCap(marketCap)}
        </span>
        <span className="font-mono text-[9px] text-purple-400/40">
          Vol {formatMarketCap(volume)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact row item (for the header/toolbar use)
// ─────────────────────────────────────────────────────────────────────────────

interface CompactItemProps {
  id: TrackedId;
  price: number;
  change24h: number;
}

function CompactItem({ id, price, change24h }: CompactItemProps) {
  const symbol  = COIN_SYMBOL[id];
  const color   = COIN_COLOR[id];
  const chColor = changeColor(change24h);
  const isPos   = change24h >= 0;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <span className="font-mono text-[10px] font-bold" style={{ color }}>{symbol}</span>
      <span className="font-mono text-[10px] font-bold text-white/80">{formatPrice(price)}</span>
      <span className="font-mono text-[9px]" style={{ color: chColor }}>
        {isPos ? '▲' : '▼'}{Math.abs(change24h).toFixed(1)}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketTicker({ compact = false }: MarketTickerProps) {
  const result = useMarketData();
  const coins  = getTrackedCoins(result);

  // ── COMPACT MODE ──────────────────────────────────────────────────────────
  if (compact) {
    if (!result) {
      // Loading — show 6 tiny skeleton pills
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {TRACKED_IDS.map(id => (
            <div key={id}
              className="h-7 w-24 rounded-lg animate-pulse"
              style={{ background: 'rgba(123,46,200,0.1)', border: '1px solid rgba(123,46,200,0.15)' }}
            />
          ))}
        </div>
      );
    }

    if (!result.ok) {
      return (
        <div className="font-mono text-[10px] text-red-400/60">
          Market data temporarily unavailable
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {coins.map(c => (
          <CompactItem
            key={c.id}
            id={c.id as TrackedId}
            price={c.current_price}
            change24h={c.price_change_percentage_24h}
          />
        ))}
      </div>
    );
  }

  // ── FULL GRID MODE ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Section header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="font-display text-xs text-yellow-400/70 tracking-widest">
            LIVE MARKET PRICES
          </div>
          {/* Live pulse dot */}
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-[9px] text-purple-400/40">CoinGecko · 60s</span>
          </div>
        </div>
        {result?.ok && (
          <span className="font-mono text-[9px] text-purple-400/30">
            Updated {new Date(result.fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Loading state */}
        {!result && TRACKED_IDS.map(id => <SkeletonCard key={id} />)}

        {/* Error state */}
        {result && !result.ok && <ErrorBanner />}

        {/* Live data */}
        {result?.ok && coins.map(c => (
          <CoinCard
            key={c.id}
            id={c.id as TrackedId}
            price={c.current_price}
            change24h={c.price_change_percentage_24h}
            marketCap={c.market_cap}
            volume={c.total_volume}
            rank={c.market_cap_rank}
          />
        ))}
      </div>
    </div>
  );
}
