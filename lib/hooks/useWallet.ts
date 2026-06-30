"use client";

import { useState, useEffect, useCallback } from "react";
import { connectWallet, getConnectedAddress, getChainId } from "../wallet";
import { STUDIONET } from "../chain";

export interface WalletContext {
  address: string | null;
  connected: boolean;
  chainId: number | null;
  onCorrectChain: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

export function useWallet(): WalletContext {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only auto-read the wallet if the user previously connected in this session
  const [sessionConnected, setSessionConnected] = useState(false);

  const refresh = useCallback(async () => {
    // Silently read already-connected accounts (no popup)
    const addr = await getConnectedAddress();
    const cid = await getChainId();
    setAddress(addr);
    setChainId(cid);
  }, []);

  useEffect(() => {
    // Only auto-read if user already connected this session
    if (sessionConnected) {
      refresh();
    }
    if (typeof window !== "undefined" && window.ethereum) {
      // Respond to wallet-initiated account/chain changes regardless
      window.ethereum.on("accountsChanged", refresh);
      window.ethereum.on("chainChanged", refresh);
      return () => {
        window.ethereum?.removeListener("accountsChanged", refresh);
        window.ethereum?.removeListener("chainChanged", refresh);
      };
    }
  }, [refresh, sessionConnected]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const addr = await connectWallet();
      const cid = await getChainId();
      setAddress(addr);
      setChainId(cid);
      setSessionConnected(true);
      sessionStorage.setItem("reymedi_connected", "1");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to connect wallet");
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setSessionConnected(false);
    sessionStorage.removeItem("reymedi_connected");
  }, []);

  // Restore session flag on mount (survives page refresh within same tab session)
  useEffect(() => {
    if (sessionStorage.getItem("reymedi_connected") === "1") {
      setSessionConnected(true);
    }
  }, []);

  return {
    address,
    connected: !!address,
    chainId,
    onCorrectChain: chainId === STUDIONET.id,
    connect,
    disconnect,
    error,
  };
}
