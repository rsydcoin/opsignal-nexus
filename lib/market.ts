import { useState, useEffect } from 'react';
/**
 * lib/market.ts
 * Centralised real-market-data service for Opsignal Nexus.
 *
 * Data source: CoinGecko public API — no key required.
 * All market fetching is routed through this module; no other file
 * calls the CoinGecko endpoint directly.
 *
 * Features
 *  - fetchMarketData()  Server-safe fetch with 60 s Next.js cache.
 *  - useMarketData()    Client hook with 60 s setInterval auto-refresh.
 *  - Deterministic coin order via TRACKED_IDS.
 *  - formatPrice / formatChange / formatMarketCap helpers.
 *  - Graceful error boundary — never crashes the UI.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CoinData {
  id:                              string;   // "bitcoin"
  symbol:                          string;   // "btc"
  name:                            string;   // "Bitcoin"
  image:                           string;   // logo URL
  current_price:                   number;
  market_cap:                      number;
  market_cap_rank:                 number;
  total_volume:                    number;
  price_change_percentage_24h:     number;
  price_change_percentage_24h_in_currency: number;
  circulating_supply:              number;
  ath:                             number;
  atl:                             number;
}

export type MarketResult =
  | { ok: true;  data: CoinData[]; fetchedAt: number }
  | { ok: false; error: string;    fetchedAt: number };

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

/** The six coins Opsignal Nexus highlights, in display order. */
export const TRACKED_IDS = [
  'bitcoin',
  'ethereum',
  'solana',
  'avalanche-2',
  'binancecoin',
  'optimism',
] as const;

export type TrackedId = (typeof TRACKED_IDS)[number];

/** Short display symbol for each tracked coin. */
export const COIN_SYMBOL: Record<TrackedId, string> = {
  'bitcoin':      'BTC',
  'ethereum':     'ETH',
  'solana':       'SOL',
  'avalanche-2':  'AVAX',
  'binancecoin':  'BNB',
  'optimism':     'OP',
};

/** Accent colour per coin — matches the game's neon palette. */
export const COIN_COLOR: Record<TrackedId, string> = {
  'bitcoin':     '#f7931a',
  'ethereum':    '#627eea',
  'solana':      '#9945ff',
  'avalanche-2': '#e84142',
  'binancecoin': '#f3ba2f',
  'optimism':    '#ff0420',
};

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd' +
  '&order=market_cap_desc' +
  '&per_page=20' +
  '&page=1' +
  '&sparkline=false' +
  '&price_change_percentage=24h';

// ─────────────────────────────────────────────────────────────────────────────
// Server-safe fetch (Next.js revalidate cache)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the top-20 coins from CoinGecko.
 * Safe to call from Server Components — Next.js caches the response
 * for 60 seconds via the `next.revalidate` option.
 */
export async function fetchMarketData(): Promise<MarketResult> {
  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `CoinGecko responded with status ${res.status}`,
        fetchedAt: Date.now(),
      };
    }

    const data: CoinData[] = await res.json();
    return { ok: true, data, fetchedAt: Date.now() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
      fetchedAt: Date.now(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side hook (auto-refresh every 60 s)
// ─────────────────────────────────────────────────────────────────────────────

const REFRESH_MS = 60_000;

/** In-memory cache shared across all hook instances in the same tab. */
let _cache: MarketResult | null = null;
let _inflightPromise: Promise<MarketResult> | null = null;

/** Deduplicated fetch — at most one in-flight request at a time. */
async function fetchOnce(): Promise<MarketResult> {
  if (_inflightPromise) return _inflightPromise;
  _inflightPromise = fetchMarketData().then(r => {
    _cache = r;
    _inflightPromise = null;
    return r;
  });
  return _inflightPromise;
}

/**
 * React hook — client components only.
 * Keeps a local copy that refreshes every 60 s.
 * Returns `null` while the first load is in-flight.
 */
export function useMarketData(): MarketResult | null {
  const [result, setResult] = useState<MarketResult | null>(_cache);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const r = await fetchOnce();
      if (alive) setResult(r);
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a USD price: $67,234.21
 * Sub-$1 coins show 4 decimal places; $1–$999 show 2; $1 000+ show 2.
 */
export function formatPrice(value: number): string {
  if (!isFinite(value) || value === 0) return '$—';
  if (value < 1) {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  if (value < 1000) {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format a 24 h percentage change with sign: +3.42% / -1.07%
 */
export function formatChange(pct: number): string {
  if (!isFinite(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Format a large USD value in billions/millions: $1.23B / $456.7M
 */
export function formatMarketCap(value: number): string {
  if (!isFinite(value) || value === 0) return '$—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString('en-US')}`;
}

/**
 * Extract the six tracked coins from an API result, in TRACKED_IDS order.
 * Returns an empty array if `result` is not ok.
 */
export function getTrackedCoins(result: MarketResult | null): CoinData[] {
  if (!result?.ok) return [];
  return TRACKED_IDS
    .map(id => result.data.find(c => c.id === id))
    .filter((c): c is CoinData => c !== undefined);
}

/**
 * Find a single coin by CoinGecko id.
 */
export function getCoin(result: MarketResult | null, id: TrackedId): CoinData | null {
  if (!result?.ok) return null;
  return result.data.find(c => c.id === id) ?? null;
}

/**
 * Return the colour for a 24 h change — green / red / neutral.
 */
export function changeColor(pct: number): string {
  if (!isFinite(pct)) return '#a78bfa';
  return pct >= 0 ? '#00e676' : '#ff4444';
}
