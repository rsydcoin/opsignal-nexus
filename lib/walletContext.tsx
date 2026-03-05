'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlayerState, loadPlayerState, savePlayerState, DEFAULT_PLAYER } from './xpSystem';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  player: PlayerState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  updatePlayer: (newState: PlayerState) => void;
  signTransaction: (data: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

// OP_NET wallet interface
declare global {
  interface Window {
    opnet?: {
      connect: () => Promise<{ address: string }>;
      disconnect: () => Promise<void>;
      getAddress: () => Promise<string>;
      signMessage: (message: string) => Promise<{ signature: string }>;
      isConnected: () => Promise<boolean>;
    };
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      selectedAddress: string | null;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

async function connectOpNet(): Promise<string | null> {
  // Try OP_NET wallet first
  if (window.opnet) {
    try {
      const result = await window.opnet.connect();
      return result.address;
    } catch (e) {
      console.error('OP_NET connect error:', e);
    }
  }

  // Fallback to MetaMask/EVM wallet
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      return accounts[0] || null;
    } catch (e) {
      console.error('MetaMask connect error:', e);
    }
  }

  return null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [player, setPlayer] = useState<PlayerState>(DEFAULT_PLAYER);

  useEffect(() => {
    // Check if already connected
    const savedAddress = typeof window !== 'undefined' ? localStorage.getItem('opsignal_wallet') : null;
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setPlayer(loadPlayerState(savedAddress));
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      const address = await connectOpNet();
      if (address) {
        setWalletAddress(address);
        localStorage.setItem('opsignal_wallet', address);
        const playerData = loadPlayerState(address);
        if (!playerData.walletAddress) {
          const newPlayer = { ...DEFAULT_PLAYER, walletAddress: address };
          savePlayerState(newPlayer);
          setPlayer(newPlayer);
        } else {
          setPlayer(playerData);
        }
      } else {
        // Demo mode: generate a mock address
        const mockAddress = `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;
        setWalletAddress(mockAddress);
        localStorage.setItem('opsignal_wallet', mockAddress);
        const newPlayer = { ...DEFAULT_PLAYER, walletAddress: mockAddress, xp: 210, level: 1, wins: 3, losses: 2, winrate: 60 };
        savePlayerState(newPlayer);
        setPlayer(newPlayer);
      }
    } catch (e) {
      console.error('Wallet connection failed:', e);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setPlayer(DEFAULT_PLAYER);
    localStorage.removeItem('opsignal_wallet');
    if (window.opnet) window.opnet.disconnect?.();
  }, []);

  const updatePlayer = useCallback((newState: PlayerState) => {
    setPlayer(newState);
    savePlayerState(newState);
  }, []);

  const signTransaction = useCallback(async (data: string): Promise<string | null> => {
    if (!walletAddress) return null;
    if (window.opnet) {
      try {
        const result = await window.opnet.signMessage(data);
        return result.signature;
      } catch { /* ignore */ }
    }
    // Mock signature for demo
    return `0x${Math.random().toString(16).slice(2)}`;
  }, [walletAddress]);

  return (
    <WalletContext.Provider value={{
      walletAddress,
      isConnected: !!walletAddress,
      isConnecting,
      player,
      connectWallet,
      disconnectWallet,
      updatePlayer,
      signTransaction,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
