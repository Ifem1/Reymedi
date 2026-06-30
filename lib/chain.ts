export const STUDIONET = {
  id: 61999,
  name: "StudioNet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://studio.genlayer.com/api"] },
  },
  blockExplorers: {
    default: {
      name: "StudioNet Explorer",
      url: "https://explorer-studio.genlayer.com",
    },
  },
} as const;

export const EXPLORER_URL = "https://explorer-studio.genlayer.com";

/** Replace with deployed contract address after deployment */
export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";
