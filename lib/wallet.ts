"use client";

import { STUDIONET } from "./chain";

export type WalletState = {
  address: string | null;
  connected: boolean;
  chainId: number | null;
};

export async function connectWallet(): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Please install MetaMask or a compatible wallet.");
  }
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts[0]) throw new Error("No account returned from wallet.");

  // Switch to StudioNet
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${STUDIONET.id.toString(16)}` }],
    });
  } catch (switchErr: unknown) {
    // Chain not added yet — add it
    if ((switchErr as { code?: number }).code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${STUDIONET.id.toString(16)}`,
            chainName: STUDIONET.name,
            nativeCurrency: STUDIONET.nativeCurrency,
            rpcUrls: [STUDIONET.rpcUrls.default.http[0]],
            blockExplorerUrls: [STUDIONET.blockExplorers.default.url],
          },
        ],
      });
    } else {
      throw switchErr;
    }
  }

  return accounts[0];
}

export async function getConnectedAddress(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const accounts = (await window.ethereum.request({
    method: "eth_accounts",
  })) as string[];
  return accounts[0] ?? null;
}

export async function getChainId(): Promise<number | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const hex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  return parseInt(hex, 16);
}
