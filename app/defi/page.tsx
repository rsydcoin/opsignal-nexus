'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import HUD from '@/components/HUD';
import AICompanion from '@/components/AICompanion';
import { useWallet } from '@/lib/walletContext';
import {
  useMarketData, getTrackedCoins, getCoin, formatPrice, formatChange,
  formatMarketCap, changeColor, COIN_COLOR, TrackedId,
} from '@/lib/market';
import {
  POOL_OPTIONS, SWAP_ASSETS, PoolOption,
  buildPortfolio, getSwapQuote, calcAccruedRewards, generateStrategies,
  loadPositions, savePositions, addPosition, removePosition, claimPosition,
  StakingPosition, SwapQuote, StrategyInsight, PortfolioSnapshot,
} from '@/lib/defiEngine';
import { addXP } from '@/lib/xpSystem';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'market' | 'portfolio' | 'swap' | 'stake' | 'strategy';

const RISK_COLOR = { LOW: '#00e676', MEDIUM: '#fbbf24', HIGH: '#ff1744' };
const SIGNAL_COLOR = { BULLISH: '#00e676', BEARISH: '#ff4444', NEUTRAL: '#fbbf24' };
const SIGNAL_ICON  = { BULLISH: '📈', BEARISH: '📉', NEUTRAL: '⚡' };

// ─────────────────────────────────────────────────────────────────────────────
// Helper sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-xs tracking-widest text-yellow-400/70 mb-3 pb-2 border-b border-yellow-500/15">
      {children}
    </div>
  );
}

function StatRow({ label, value, color = '#c087f5' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-purple-500/10">
      <span className="font-ui text-xs text-purple-400">{label}</span>
      <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

function TxButton({
  label, onClick, disabled, loading, color = '#fbbf24',
}: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean; color?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3 rounded-xl font-display text-sm tracking-widest transition-all disabled:opacity-40"
      style={{
        background:   `${color}15`,
        border:       `1px solid ${color}50`,
        color,
        boxShadow:    `0 0 15px ${color}10`,
      }}
    >
      {loading ? '⚡ PROCESSING...' : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Market Data
// ─────────────────────────────────────────────────────────────────────────────

function MarketTab() {
  const result = useMarketData();
  const coins  = getTrackedCoins(result);
  const btc    = getCoin(result, 'bitcoin' as TrackedId);

  if (!result) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(123,46,200,0.1)' }} />
        ))}
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="rounded-xl p-6 border border-red-500/20 text-center">
        <div className="text-3xl mb-2">⚠</div>
        <div className="font-mono text-xs text-red-400/70">Market data temporarily unavailable</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* BTC Hero Card */}
      {btc && (
        <div className="rounded-xl p-5 border relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(247,147,26,0.08), rgba(7,17,51,0.97))', borderColor: 'rgba(247,147,26,0.35)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(247,147,26,0.07), transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-xs text-orange-400/60 tracking-widest">BITCOIN</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: 'rgba(247,147,26,0.15)', color: '#f7931a', border: '1px solid rgba(247,147,26,0.3)' }}>
                  #{btc.market_cap_rank}
                </span>
              </div>
              <div className="font-display text-3xl font-bold text-orange-400">{formatPrice(btc.current_price)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold" style={{ color: changeColor(btc.price_change_percentage_24h) }}>
                {formatChange(btc.price_change_percentage_24h)}
              </div>
              <div className="font-mono text-[10px] text-purple-400/50">24h change</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: 'rgba(7,17,51,0.7)', border: '1px solid rgba(247,147,26,0.15)' }}>
              <div className="font-mono text-[9px] text-purple-400/50 mb-1">MARKET CAP</div>
              <div className="font-mono text-sm font-bold text-orange-300">{formatMarketCap(btc.market_cap)}</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(7,17,51,0.7)', border: '1px solid rgba(247,147,26,0.15)' }}>
              <div className="font-mono text-[9px] text-purple-400/50 mb-1">24H VOLUME</div>
              <div className="font-mono text-sm font-bold text-orange-300">{formatMarketCap(btc.total_volume)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-[9px] text-purple-400/40">
              Live · CoinGecko · updated {new Date(result.fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
        </div>
      )}

      {/* All tracked coins */}
      <SectionLabel>◈ TRACKED ASSETS</SectionLabel>
      <div className="space-y-2">
        {coins.map(coin => {
          const color  = COIN_COLOR[coin.id as TrackedId] ?? '#c087f5';
          const chColor = changeColor(coin.price_change_percentage_24h);
          return (
            <div key={coin.id} className="flex items-center gap-3 rounded-lg px-4 py-3 border transition-all"
              style={{ background: 'rgba(7,17,51,0.9)', borderColor: `${color}20` }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold" style={{ color }}>{coin.symbol.toUpperCase()}</span>
                  <span className="font-mono text-[9px] text-purple-400/40 truncate">{coin.name}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-sm font-bold text-white/90">{formatPrice(coin.current_price)}</div>
                <div className="font-mono text-[9px]" style={{ color: chColor }}>{formatChange(coin.price_change_percentage_24h)}</div>
              </div>
              <div className="text-right flex-shrink-0 hidden sm:block">
                <div className="font-mono text-[10px] text-purple-400/50">{formatMarketCap(coin.market_cap)}</div>
                <div className="font-mono text-[9px] text-purple-400/30">mcap</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Portfolio
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioTab({ walletAddress }: { walletAddress: string }) {
  const result    = useMarketData();
  const [positions, setPositions] = useState<StakingPosition[]>([]);

  useEffect(() => {
    setPositions(loadPositions(walletAddress));
  }, [walletAddress]);

  const portfolio = useMemo<PortfolioSnapshot | null>(() => {
    if (!result?.ok) return null;
    return buildPortfolio(walletAddress, result.data, positions);
  }, [walletAddress, result, positions]);

  if (!portfolio) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(123,46,200,0.1)' }} />
        ))}
      </div>
    );
  }

  const priceOf = (id: string) =>
    (result?.ok ? result.data.find(c => c.id === id)?.current_price : 0) ?? 0;

  const totalStakedUsd = positions.reduce(
    (sum, p) => sum + p.amountStaked * priceOf(p.coinId), 0
  );

  return (
    <div className="space-y-4">
      {/* Wallet overview */}
      <div className="rounded-xl p-5 border"
        style={{ background: 'linear-gradient(135deg, rgba(0,230,118,0.06), rgba(7,17,51,0.97))', borderColor: 'rgba(0,230,118,0.25)' }}>
        <SectionLabel>◈ WALLET OVERVIEW</SectionLabel>
        <div className="font-mono text-[10px] text-purple-400/50 mb-1">ADDRESS</div>
        <div className="font-mono text-xs text-cyan-400 mb-4 break-all">{walletAddress}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.15)' }}>
            <div className="font-mono text-[9px] text-purple-400/50 mb-1">TOTAL PORTFOLIO</div>
            <div className="font-mono text-lg font-bold text-green-400">
              {formatPrice(portfolio.estimatedUsdValue)}
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)' }}>
            <div className="font-mono text-[9px] text-purple-400/50 mb-1">STAKED VALUE</div>
            <div className="font-mono text-lg font-bold text-cyan-400">
              {formatPrice(totalStakedUsd)}
            </div>
          </div>
        </div>
      </div>

      {/* Token balances */}
      <div className="arcane-card rounded-xl p-5">
        <SectionLabel>◈ SPOT BALANCES</SectionLabel>
        <div className="space-y-1">
          <StatRow label="BTC" value={`${portfolio.btcBalance.toFixed(5)} BTC ≈ ${formatPrice(portfolio.btcBalance * priceOf('bitcoin'))}`} color="#f7931a" />
          <StatRow label="ETH" value={`${portfolio.ethBalance.toFixed(4)} ETH ≈ ${formatPrice(portfolio.ethBalance * priceOf('ethereum'))}`} color="#627eea" />
          <StatRow label="OP"  value={`${portfolio.opBalance.toFixed(2)} OP ≈ ${formatPrice(portfolio.opBalance * priceOf('optimism'))}`} color="#ff0420" />
          <StatRow label="USDT" value={`${portfolio.usdtBalance.toFixed(2)} USDT`} color="#00e676" />
        </div>
      </div>

      {/* Staking positions */}
      <div className="arcane-card rounded-xl p-5">
        <SectionLabel>◈ STAKING POSITIONS</SectionLabel>
        {positions.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🔒</div>
            <div className="font-body italic text-purple-300/50 text-sm">No active positions</div>
            <div className="font-mono text-[10px] text-purple-400/30 mt-1">Visit the Stake tab to earn yield</div>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map(pos => {
              const price  = priceOf(pos.coinId);
              const rewards = calcAccruedRewards(pos, price);
              return (
                <div key={pos.id} className="rounded-lg p-3 border" style={{ background: 'rgba(4,13,36,0.7)', borderColor: 'rgba(123,46,200,0.2)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-ui text-sm text-yellow-300 font-bold">{pos.poolName}</div>
                      <div className="font-mono text-[10px] text-purple-400/60">{pos.asset} · {pos.apr}% APR</div>
                    </div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{ color: RISK_COLOR[pos.risk], background: `${RISK_COLOR[pos.risk]}15`, border: `1px solid ${RISK_COLOR[pos.risk]}30` }}>
                      {pos.risk}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <div className="text-purple-400/50">Staked</div>
                      <div className="font-mono text-white/80">{pos.amountStaked} {pos.asset} ≈ {formatPrice(pos.amountStaked * price)}</div>
                    </div>
                    <div>
                      <div className="text-purple-400/50">Accrued</div>
                      <div className="font-mono text-green-400">{formatPrice(rewards)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Swap
// ─────────────────────────────────────────────────────────────────────────────

function SwapTab({ walletAddress, isConnected, signTransaction, onXP }: {
  walletAddress: string | null; isConnected: boolean;
  signTransaction: (d: string) => Promise<string | null>;
  onXP: (xp: number) => void;
}) {
  const result = useMarketData();
  const [fromAsset, setFromAsset] = useState('BTC');
  const [toAsset,   setToAsset]   = useState('USDT');
  const [amount,    setAmount]    = useState('');
  const [quote,     setQuote]     = useState<SwapQuote | null>(null);
  const [step,      setStep]      = useState<'input' | 'preview' | 'confirming' | 'done' | 'error'>('input');
  const [txHash,    setTxHash]    = useState('');
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const marketData = result?.ok ? result.data : [];

  const handleGetQuote = useCallback(() => {
    const amt = parseFloat(amount);
    if (!amt || !result?.ok) return;
    const q = getSwapQuote(fromAsset, toAsset, amt, marketData);
    setQuote(q);
    if (q) {
      setStep('preview');
      setAiInsights([
        `🔮 Swap route: ${q.route}`,
        `📊 Exchange rate: 1 ${fromAsset} = ${q.exchangeRate.toFixed(6)} ${toAsset}`,
        `⚡ Price impact: ${q.priceImpact.toFixed(3)}% — ${q.priceImpact < 0.1 ? 'negligible' : q.priceImpact < 0.5 ? 'minimal' : 'moderate'}`,
        `💸 Fee estimate: ${formatPrice(q.fee)} (0.25% AMM fee)`,
      ]);
    }
  }, [amount, fromAsset, toAsset, result, marketData]);

  const handleConfirm = useCallback(async () => {
    if (!quote || !isConnected) return;
    setStep('confirming');
    await new Promise(r => setTimeout(r, 1200));
    const sig = await signTransaction(`SWAP:${fromAsset}:${toAsset}:${quote.fromAmount}`);
    if (sig) {
      setTxHash(sig.slice(0, 20) + '...');
      setStep('done');
      onXP(25);
      setAiInsights([
        `✅ Swap executed: ${quote.fromAmount} ${fromAsset} → ${quote.toAmount.toFixed(6)} ${toAsset}`,
        `📝 Tx hash: ${sig.slice(0, 16)}...`,
        `🎮 +25 XP awarded for executing trade`,
      ]);
    } else {
      setStep('error');
    }
  }, [quote, isConnected, fromAsset, toAsset, signTransaction, onXP]);

  const handleReset = () => { setStep('input'); setQuote(null); setAmount(''); setTxHash(''); };

  const swapAssets = () => { setFromAsset(toAsset); setToAsset(fromAsset); setQuote(null); setStep('input'); };

  return (
    <div className="space-y-4">
      <div className="arcane-card rounded-xl p-5">
        <SectionLabel>◈ SWAP INTERFACE</SectionLabel>

        {step === 'done' ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <div className="font-display text-green-400 text-sm tracking-widest mb-2">SWAP EXECUTED</div>
            <div className="font-mono text-[10px] text-purple-400/60 mb-1">
              {quote?.fromAmount} {fromAsset} → {quote?.toAmount.toFixed(6)} {toAsset}
            </div>
            <div className="font-mono text-[9px] text-purple-400/40 mb-4">TX: {txHash}</div>
            <button onClick={handleReset}
              className="font-display text-xs tracking-widest text-purple-400 hover:text-yellow-400 transition-colors">
              New Swap →
            </button>
          </div>
        ) : step === 'error' ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">❌</div>
            <div className="font-display text-red-400 text-sm tracking-widest mb-4">TRANSACTION FAILED</div>
            <button onClick={handleReset} className="font-display text-xs tracking-widest text-purple-400 hover:text-yellow-400">Retry →</button>
          </div>
        ) : (
          <>
            {/* From */}
            <div className="mb-3">
              <label className="font-ui text-xs text-purple-400/70 tracking-wider font-bold mb-1.5 block">FROM</label>
              <div className="flex gap-2">
                <select value={fromAsset} onChange={e => { setFromAsset(e.target.value); setQuote(null); setStep('input'); }}
                  className="arcane-input rounded-lg px-3 py-2.5 font-mono text-sm flex-shrink-0 w-28">
                  {SWAP_ASSETS.filter(a => a.symbol !== toAsset).map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
                  ))}
                </select>
                <input
                  type="number" value={amount} onChange={e => { setAmount(e.target.value); setQuote(null); setStep('input'); }}
                  placeholder="0.00" min="0"
                  className="arcane-input flex-1 rounded-lg px-4 py-2.5 font-mono text-sm"
                />
              </div>
            </div>

            {/* Swap direction button */}
            <div className="flex justify-center my-2">
              <button onClick={swapAssets}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(123,46,200,0.2)', border: '1px solid rgba(123,46,200,0.4)' }}>
                <span className="text-purple-400 text-sm">⇅</span>
              </button>
            </div>

            {/* To */}
            <div className="mb-4">
              <label className="font-ui text-xs text-purple-400/70 tracking-wider font-bold mb-1.5 block">TO</label>
              <div className="flex gap-2">
                <select value={toAsset} onChange={e => { setToAsset(e.target.value); setQuote(null); setStep('input'); }}
                  className="arcane-input rounded-lg px-3 py-2.5 font-mono text-sm flex-shrink-0 w-28">
                  {SWAP_ASSETS.filter(a => a.symbol !== fromAsset).map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
                  ))}
                </select>
                <div className="arcane-input flex-1 rounded-lg px-4 py-2.5 font-mono text-sm flex items-center"
                  style={{ color: quote ? '#00e676' : 'rgba(162,145,200,0.4)' }}>
                  {quote ? quote.toAmount.toFixed(6) : '—'}
                </div>
              </div>
            </div>

            {/* Quote preview */}
            {quote && step === 'preview' && (
              <div className="rounded-lg p-3 mb-4 border space-y-1"
                style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.15)' }}>
                <div className="font-display text-[10px] text-cyan-400 tracking-widest mb-2">SWAP PREVIEW</div>
                <StatRow label="Rate" value={`1 ${fromAsset} = ${quote.exchangeRate.toFixed(6)} ${toAsset}`} color="#00e5ff" />
                <StatRow label="Price Impact" value={`${quote.priceImpact.toFixed(3)}%`} color={quote.priceImpact > 0.5 ? '#fbbf24' : '#00e676'} />
                <StatRow label="Fee" value={formatPrice(quote.fee)} color="#c087f5" />
                <StatRow label="Route" value={quote.route} color="#a78bfa" />
                <div className="font-mono text-[9px] text-purple-400/40 mt-1">
                  Quote valid for {quote.validFor}s · via OPNet AMM
                </div>
              </div>
            )}

            {/* Action buttons */}
            {step === 'input' || !quote ? (
              <TxButton
                label={!isConnected ? '🔒 CONNECT WALLET' : !amount ? 'ENTER AMOUNT' : '🔍 GET QUOTE'}
                onClick={handleGetQuote}
                disabled={!isConnected || !amount || parseFloat(amount) <= 0 || fromAsset === toAsset}
                color="#00e5ff"
              />
            ) : step === 'preview' ? (
              <div className="space-y-2">
                <TxButton label="✅ CONFIRM SWAP" onClick={handleConfirm} color="#00e676" />
                <button onClick={handleReset}
                  className="w-full py-2 font-display text-xs tracking-widest text-purple-400/60 hover:text-purple-300 transition-colors">
                  Cancel
                </button>
              </div>
            ) : step === 'confirming' ? (
              <TxButton label="⚡ SIGNING..." onClick={() => {}} loading color="#fbbf24" />
            ) : null}
          </>
        )}
      </div>
      <AICompanion insights={aiInsights} isAnalyzing={step === 'confirming'} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Staking
// ─────────────────────────────────────────────────────────────────────────────

function StakeTab({ walletAddress, isConnected, signTransaction, onXP }: {
  walletAddress: string | null; isConnected: boolean;
  signTransaction: (d: string) => Promise<string | null>;
  onXP: (xp: number) => void;
}) {
  const result = useMarketData();
  const [selectedPool, setSelectedPool] = useState<PoolOption | null>(null);
  const [stakeAmount, setStakeAmount]   = useState('');
  const [positions, setPositions]       = useState<StakingPosition[]>([]);
  const [action, setAction]             = useState<'stake' | 'manage'>('stake');
  const [processing, setProcessing]     = useState<string | null>(null);
  const [aiInsights, setAiInsights]     = useState<string[]>([]);

  useEffect(() => {
    if (walletAddress) setPositions(loadPositions(walletAddress));
  }, [walletAddress]);

  const priceOf = useCallback((id: string) =>
    (result?.ok ? result.data.find(c => c.id === id)?.current_price : 0) ?? 0,
    [result]
  );

  const handleStake = async () => {
    if (!selectedPool || !walletAddress || !stakeAmount) return;
    const amt = parseFloat(stakeAmount);
    if (!amt || amt <= 0) return;
    setProcessing('stake');
    await new Promise(r => setTimeout(r, 1400));
    await signTransaction(`STAKE:${selectedPool.id}:${amt}`);
    const pos = addPosition(walletAddress, selectedPool, amt);
    const updated = [...positions, pos];
    setPositions(updated);
    onXP(selectedPool.risk === 'HIGH' ? 60 : 35);
    setAiInsights([
      `✅ Staked ${amt} ${selectedPool.asset} in ${selectedPool.name}`,
      `📈 Earning ${selectedPool.apr}% APR — ~${formatPrice(amt * priceOf(selectedPool.coinId) * selectedPool.apr / 100 / 365)} per day`,
      `🎮 +${selectedPool.risk === 'HIGH' ? 60 : 35} XP for staking ritual`,
    ]);
    setStakeAmount('');
    setProcessing(null);
  };

  const handleUnstake = async (posId: string) => {
    if (!walletAddress) return;
    setProcessing(posId);
    await new Promise(r => setTimeout(r, 1200));
    await signTransaction(`UNSTAKE:${posId}`);
    removePosition(walletAddress, posId);
    const updated = positions.filter(p => p.id !== posId);
    setPositions(updated);
    setAiInsights([`✅ Unstaked position. Funds returned to wallet.`]);
    setProcessing(null);
  };

  const handleClaim = async (posId: string, pos: StakingPosition) => {
    if (!walletAddress) return;
    setProcessing(`claim-${posId}`);
    const rewards = calcAccruedRewards(pos, priceOf(pos.coinId));
    await new Promise(r => setTimeout(r, 900));
    await signTransaction(`CLAIM:${posId}`);
    claimPosition(walletAddress, posId);
    const updated = loadPositions(walletAddress);
    setPositions(updated);
    onXP(15);
    setAiInsights([
      `💰 Claimed ${formatPrice(rewards)} rewards from ${pos.poolName}`,
      `🎮 +15 XP for claiming rewards`,
    ]);
    setProcessing(null);
  };

  const previewReward = selectedPool && stakeAmount
    ? (parseFloat(stakeAmount) || 0) * priceOf(selectedPool.coinId) * selectedPool.apr / 100 / 365
    : 0;

  return (
    <div className="space-y-4">
      {/* Stake new */}
      <div className="arcane-card rounded-xl p-5">
        <div className="flex gap-2 mb-4">
          {(['stake', 'manage'] as const).map(t => (
            <button key={t} onClick={() => setAction(t)}
              className="flex-1 py-1.5 rounded-lg font-display text-xs tracking-widest transition-all"
              style={{
                background:  action === t ? 'rgba(245,158,11,0.12)' : 'transparent',
                border:      action === t ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(123,46,200,0.2)',
                color:       action === t ? '#fbbf24' : 'rgba(150,130,190,0.5)',
              }}>
              {t === 'stake' ? '🔒 STAKE' : '⚙ MANAGE'}
            </button>
          ))}
        </div>

        {action === 'stake' ? (
          <>
            <SectionLabel>◈ SELECT POOL</SectionLabel>
            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
              {POOL_OPTIONS.map(pool => (
                <button key={pool.id} onClick={() => setSelectedPool(pool)}
                  className="w-full text-left rounded-lg p-3 border transition-all"
                  style={{
                    border: selectedPool?.id === pool.id ? '1px solid rgba(245,158,11,0.6)' : '1px solid rgba(123,46,200,0.2)',
                    background: selectedPool?.id === pool.id ? 'rgba(245,158,11,0.07)' : 'rgba(7,17,51,0.5)',
                  }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-ui text-sm text-yellow-300 font-bold">{pool.name}</div>
                      <div className="font-mono text-[10px] text-purple-400/60">{pool.protocol} · {pool.asset}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-yellow-400 font-bold">{pool.apr}%</div>
                      <span className="font-mono text-[9px] font-bold px-1.5 rounded"
                        style={{ color: RISK_COLOR[pool.risk], background: `${RISK_COLOR[pool.risk]}15` }}>
                        {pool.risk}
                      </span>
                    </div>
                  </div>
                  {selectedPool?.id === pool.id && (
                    <div className="font-mono text-[9px] text-purple-400/50 mt-1.5">{pool.description}</div>
                  )}
                </button>
              ))}
            </div>

            {selectedPool && (
              <>
                <div className="mb-3">
                  <label className="font-ui text-xs text-purple-400/70 tracking-wider font-bold mb-1.5 block">
                    AMOUNT ({selectedPool.asset})
                  </label>
                  <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)}
                    placeholder={`0.00 ${selectedPool.asset}`} min="0"
                    className="arcane-input w-full rounded-lg px-4 py-2.5 font-mono text-sm" />
                </div>
                {stakeAmount && parseFloat(stakeAmount) > 0 && (
                  <div className="rounded-lg p-3 mb-3 border space-y-1"
                    style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}>
                    <StatRow label="APR" value={`${selectedPool.apr}%`} color="#fbbf24" />
                    <StatRow label="Est. Daily Reward" value={formatPrice(previewReward)} color="#00e676" />
                    <StatRow label="Est. Annual Reward" value={formatPrice(previewReward * 365)} color="#00e676" />
                    <StatRow label="Pool TVL" value={formatMarketCap(selectedPool.tvlUsd)} color="#c087f5" />
                    {selectedPool.lockDays > 0 && (
                      <StatRow label="Lock Period" value={`${selectedPool.lockDays} days`} color="#fbbf24" />
                    )}
                  </div>
                )}
                <TxButton
                  label={!isConnected ? '🔒 CONNECT WALLET' : !stakeAmount ? 'ENTER AMOUNT' : '🔒 STAKE NOW'}
                  onClick={handleStake}
                  disabled={!isConnected || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  loading={processing === 'stake'}
                  color="#00e676"
                />
              </>
            )}
          </>
        ) : (
          <>
            <SectionLabel>◈ ACTIVE POSITIONS</SectionLabel>
            {positions.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🔓</div>
                <div className="font-body italic text-purple-300/50 text-sm">No active staking positions</div>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map(pos => {
                  const price   = priceOf(pos.coinId);
                  const rewards = calcAccruedRewards(pos, price);
                  const isUnstaking = processing === pos.id;
                  const isClaiming  = processing === `claim-${pos.id}`;
                  return (
                    <div key={pos.id} className="rounded-lg p-4 border"
                      style={{ background: 'rgba(4,13,36,0.8)', borderColor: 'rgba(123,46,200,0.25)' }}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-ui text-sm font-bold text-yellow-300">{pos.poolName}</div>
                          <div className="font-mono text-[10px] text-purple-400/60">{pos.asset} · {pos.apr}% APR</div>
                        </div>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                          style={{ color: RISK_COLOR[pos.risk], background: `${RISK_COLOR[pos.risk]}15` }}>
                          {pos.risk}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
                        <div>
                          <div className="text-purple-400/50 mb-0.5">Staked</div>
                          <div className="font-mono text-white/80">{pos.amountStaked} {pos.asset}</div>
                          <div className="font-mono text-purple-400/40">{formatPrice(pos.amountStaked * price)}</div>
                        </div>
                        <div>
                          <div className="text-purple-400/50 mb-0.5">Pending Rewards</div>
                          <div className="font-mono text-green-400 font-bold">{formatPrice(rewards)}</div>
                          <div className="font-mono text-purple-400/40">{new Date(pos.stakedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleClaim(pos.id, pos)}
                          disabled={!!processing || rewards < 0.001}
                          className="py-2 rounded-lg font-display text-[10px] tracking-wider transition-all disabled:opacity-40"
                          style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', color: '#00e676' }}>
                          {isClaiming ? '⚡...' : '💰 CLAIM'}
                        </button>
                        <button
                          onClick={() => handleUnstake(pos.id)}
                          disabled={!!processing}
                          className="py-2 rounded-lg font-display text-[10px] tracking-wider transition-all disabled:opacity-40"
                          style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.25)', color: '#ff6b6b' }}>
                          {isUnstaking ? '⚡...' : '🔓 UNSTAKE'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <AICompanion insights={aiInsights} isAnalyzing={!!processing} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Strategy Insights
// ─────────────────────────────────────────────────────────────────────────────

function StrategyTab({ walletAddress, isConnected, signTransaction, onXP }: {
  walletAddress: string | null; isConnected: boolean;
  signTransaction: (d: string) => Promise<string | null>;
  onXP: (xp: number) => void;
}) {
  const result = useMarketData();
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [executing, setExecuting] = useState<string | null>(null);
  const [executed, setExecuted]   = useState<Set<string>>(new Set());
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  useEffect(() => {
    if (walletAddress) setPositions(loadPositions(walletAddress));
  }, [walletAddress]);

  const portfolio = useMemo<PortfolioSnapshot | null>(() => {
    if (!result?.ok || !walletAddress) return null;
    return buildPortfolio(walletAddress, result.data, positions);
  }, [walletAddress, result, positions]);

  const strategies = useMemo<StrategyInsight[]>(() => {
    if (!result?.ok) return [];
    return generateStrategies(result.data, portfolio);
  }, [result, portfolio]);

  const handleExecute = async (strategy: StrategyInsight) => {
    if (!isConnected) return;
    setExecuting(strategy.id);
    await new Promise(r => setTimeout(r, 1600));
    await signTransaction(`STRATEGY:${strategy.id}`);
    setExecuted(prev => new Set([...prev, strategy.id]));
    onXP(strategy.xpReward);
    setAiInsights([
      `⚡ Strategy "${strategy.title}" initiated`,
      ...strategy.steps.map((s, i) => `${i + 1}. ${s}`),
      `🎮 +${strategy.xpReward} XP awarded`,
    ]);
    setExecuting(null);
  };

  if (!result) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: 'rgba(123,46,200,0.1)' }} />
        ))}
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="rounded-xl p-6 border border-red-500/20 text-center">
        <div className="font-mono text-xs text-red-400/70">Market data unavailable — strategies require live prices</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl p-4 border"
        style={{ background: 'linear-gradient(135deg, rgba(155,77,232,0.08), rgba(7,17,51,0.97))', borderColor: 'rgba(155,77,232,0.3)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="font-display text-sm text-purple-300 tracking-widest">AI STRATEGY ENGINE</span>
        </div>
        <div className="font-body italic text-purple-300/60 text-xs">
          Generating strategies from live BTC/ETH/OP market data · Updated every 60s
        </div>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🔮</div>
          <div className="font-body italic text-purple-300/50">Awaiting oracle data...</div>
        </div>
      ) : (
        strategies.map(strategy => {
          const isExec    = executing === strategy.id;
          const isDone    = executed.has(strategy.id);
          const sigColor  = SIGNAL_COLOR[strategy.signal];
          const sigIcon   = SIGNAL_ICON[strategy.signal];

          return (
            <div key={strategy.id} className="arcane-card rounded-xl p-5 border relative overflow-hidden"
              style={{ borderColor: `${sigColor}25` }}>
              <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${sigColor}06, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded font-bold"
                      style={{ color: sigColor, background: `${sigColor}15`, border: `1px solid ${sigColor}30` }}>
                      {sigIcon} {strategy.signal}
                    </span>
                    <span className="font-mono text-[9px] text-purple-400/50">
                      {strategy.confidence.toFixed(0)}% confidence
                    </span>
                  </div>
                  <div className="font-display text-sm text-yellow-300 font-bold">{strategy.title}</div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="font-mono text-lg font-bold" style={{ color: '#00e676' }}>{strategy.estimatedYield}%</div>
                  <div className="font-mono text-[9px] text-purple-400/40">est. APR</div>
                </div>
              </div>

              <div className="font-body italic text-purple-300/70 text-xs mb-3">{strategy.details}</div>

              <div className="rounded-lg p-3 mb-3 border space-y-1"
                style={{ background: 'rgba(4,13,36,0.6)', borderColor: 'rgba(123,46,200,0.15)' }}>
                <div className="font-display text-[9px] text-purple-400/50 tracking-widest mb-1.5">SUGGESTED ACTION</div>
                <div className="font-ui text-sm text-cyan-400 font-bold mb-2">{strategy.suggestedAction}</div>
                {strategy.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[9px] text-purple-500/60 flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="font-mono text-[10px] text-purple-300/70">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: RISK_COLOR[strategy.riskLevel], background: `${RISK_COLOR[strategy.riskLevel]}15` }}>
                    {strategy.riskLevel} RISK
                  </span>
                  <span className="font-mono text-[9px] text-yellow-400/60">+{strategy.xpReward} XP</span>
                </div>
                {isDone ? (
                  <span className="font-mono text-[10px] text-green-400">✅ Executed</span>
                ) : (
                  <button
                    onClick={() => handleExecute(strategy)}
                    disabled={!isConnected || !!executing}
                    className="px-4 py-2 rounded-lg font-display text-[10px] tracking-widest transition-all disabled:opacity-40"
                    style={{ background: `${sigColor}12`, border: `1px solid ${sigColor}40`, color: sigColor }}>
                    {isExec ? '⚡ EXECUTING...' : !isConnected ? '🔒 CONNECT' : '⚡ EXECUTE STRATEGY'}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      <AICompanion insights={aiInsights} isAnalyzing={!!executing} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DeFi Hub page
// ─────────────────────────────────────────────────────────────────────────────

const TAB_CONFIG: { id: Tab; icon: string; label: string }[] = [
  { id: 'market',   icon: '📊', label: 'Market'   },
  { id: 'portfolio',icon: '💼', label: 'Portfolio' },
  { id: 'swap',     icon: '⇄',  label: 'Swap'     },
  { id: 'stake',    icon: '🔒', label: 'Stake'    },
  { id: 'strategy', icon: '🔮', label: 'Strategy' },
];

export default function DeFiHubPage() {
  const { walletAddress, isConnected, player, updatePlayer, signTransaction } = useWallet();
  const [tab, setTab] = useState<Tab>('market');

  const handleXP = useCallback((xp: number) => {
    const { newPlayer } = addXP(player, xp);
    updatePlayer(newPlayer);
  }, [player, updatePlayer]);

  return (
    <div className="min-h-screen">
      <HUD />
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-purple-400 hover:text-yellow-400 transition-colors text-sm font-ui">← Hub</Link>
          <div>
            <div className="font-display text-2xl text-yellow-400 tracking-widest glow-gold">
              ⚡ DEFI HUB
            </div>
            <div className="font-mono text-[10px] text-purple-400/50 tracking-wider">
              Real-time market data · Swap · Stake · Strategy
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 mb-6 p-1.5 rounded-xl border border-purple-500/20"
          style={{ background: 'rgba(4,13,36,0.8)' }}>
          {TAB_CONFIG.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg font-display text-[10px] sm:text-xs tracking-widest transition-all flex items-center justify-center gap-1"
              style={{
                background:  tab === t.id ? 'rgba(245,158,11,0.12)' : 'transparent',
                border:      tab === t.id ? '1px solid rgba(245,158,11,0.35)' : '1px solid transparent',
                color:       tab === t.id ? '#fbbf24' : 'rgba(150,130,190,0.5)',
              }}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Connect prompt (shown on non-market tabs when disconnected) */}
        {!isConnected && tab !== 'market' && (
          <div className="arcane-card rounded-xl p-8 border border-yellow-500/20 text-center mb-4">
            <div className="text-4xl mb-3">🔒</div>
            <div className="font-display text-yellow-400 text-sm tracking-widest mb-2">CONNECT WALLET</div>
            <div className="font-body italic text-purple-300/60 text-xs">
              Connect your wallet to access {tab} features
            </div>
          </div>
        )}

        {/* Tab content */}
        {tab === 'market' && <MarketTab />}
        {tab === 'portfolio' && isConnected && walletAddress && (
          <PortfolioTab walletAddress={walletAddress} />
        )}
        {tab === 'swap' && (
          <SwapTab
            walletAddress={walletAddress}
            isConnected={isConnected}
            signTransaction={signTransaction}
            onXP={handleXP}
          />
        )}
        {tab === 'stake' && (
          <StakeTab
            walletAddress={walletAddress}
            isConnected={isConnected}
            signTransaction={signTransaction}
            onXP={handleXP}
          />
        )}
        {tab === 'strategy' && (
          <StrategyTab
            walletAddress={walletAddress}
            isConnected={isConnected}
            signTransaction={signTransaction}
            onXP={handleXP}
          />
        )}
      </main>
    </div>
  );
}
