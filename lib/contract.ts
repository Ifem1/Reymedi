"use client";

import { CONTRACT_ADDRESS } from "./chain";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PoolStatus = "draft" | "active" | "paused" | "closing" | "closed";
export type ClaimStatus =
  | "draft" | "submitted" | "merchant_response_pending" | "ready_for_review"
  | "reviewing" | "approved" | "partially_approved" | "rejected" | "excluded"
  | "unverifiable" | "manual_review" | "paid" | "cancelled";

export type VerdictCode =
  | "NO_FAILURE" | "QUALIFYING_FAILURE" | "PARTIAL_FAILURE"
  | "MERCHANT_NOT_RESPONSIBLE" | "EXCLUDED_BY_POLICY" | "INSUFFICIENT_EVIDENCE"
  | "CLAIMANT_FAULT" | "DUPLICATE_OR_ABUSIVE" | "MANUAL_REVIEW";

export type PayoutBand = "NONE" | "SMALL" | "PARTIAL" | "FULL" | "MANUAL";

export interface RemedyPool {
  pool_id: string;
  merchant: string;
  title: string;
  category: string;
  policy_summary: string;
  policy_hash: string;
  public_policy_url: string;
  status: PoolStatus;
  total_deposited: number;
  available_balance: number;
  reserved_balance: number;
  paid_balance: number;
  min_claim_amount: string;
  max_claim_amount: string;
  claim_window_seconds: string;
}

export interface Claim {
  claim_id: string;
  pool_id: string;
  claimant: string;
  public_ref: string;
  claim_summary: string;
  requested_amount: number;
  reserved_amount: number;
  private_evidence_hash: string;
  public_evidence_url: string;
  status: ClaimStatus;
  final_payout_amount: number;
  verdict_code: VerdictCode | null;
  verdict_summary: string | null;
  merchant_response_summary: string | null;
  merchant_response_url: string | null;
  claimant_response_summary: string | null;
  settlement_offer_amount: number | null;
  settlement_pending: boolean;
  resolved_at: string | null;
  paid_at: string | null;
}

export interface PublicStats {
  total_pools: number;
  active_pools: number;
  total_claims: number;
  total_paid_wei: number;
  platform_paused: boolean;
}

// ─── GenLayer client ──────────────────────────────────────────────────────────

import { createClient } from "genlayer-js";
import { studionet as glStudionet } from "genlayer-js/chains";
import type { CalldataEncodable } from "genlayer-js/types";

const readClient = createClient({ chain: glStudionet } as any);

function normaliseResult(value: unknown): unknown {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { /* leave as string */ }
  }
  return value;
}

function ensureArray<T>(value: unknown): T[] {
  const v = normaliseResult(value);
  if (Array.isArray(v)) return v as T[];
  return [];
}

async function viewCall<T>(fnName: string, args: unknown[]): Promise<T> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: fnName,
    args: args as CalldataEncodable[],
  });
  return normaliseResult(result) as T;
}

// Writes: use genlayer-js writeContract with the injected wallet as provider.
// The SDK handles: encode → RLP wrap → addTransaction ABI → consensusMainContract.
async function sendTx(
  fromAddress: string,
  fnName: string,
  args: unknown[],
  valueWei?: bigint
): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet available");
  }
  const client = createClient({
    chain: glStudionet,
    account: fromAddress as `0x${string}`,
    provider: window.ethereum,
  } as any);
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: fnName,
    args: args as CalldataEncodable[],
    value: valueWei ?? 0n,
  });
  return txHash as string;
}

// ─── View methods ─────────────────────────────────────────────────────────────

export async function getPool(poolId: string): Promise<RemedyPool> {
  return viewCall<RemedyPool>("get_pool", [poolId]);
}

export async function getClaimPublic(claimId: string): Promise<Partial<Claim>> {
  return viewCall<Partial<Claim>>("get_claim_public", [claimId]);
}

export async function getClaimPrivate(claimId: string, viewer: string): Promise<Claim> {
  return viewCall<Claim>("get_claim_private", [claimId, viewer]);
}

export async function getMerchantPools(merchant: string): Promise<RemedyPool[]> {
  const result = await viewCall<unknown>("get_merchant_pools", [merchant]);
  return ensureArray<RemedyPool>(result);
}

export async function getClaimantClaims(claimant: string): Promise<Claim[]> {
  const result = await viewCall<unknown>("get_claimant_claims", [claimant]);
  return ensureArray<Claim>(result);
}

export async function getPoolClaimsForMerchant(poolId: string): Promise<Claim[]> {
  const result = await viewCall<unknown>("get_pool_claims_for_merchant", [poolId]);
  return ensureArray<Claim>(result);
}

export async function getPublicStats(): Promise<PublicStats> {
  return viewCall<PublicStats>("get_public_stats", []);
}

export async function getAllPoolsPublic(): Promise<RemedyPool[]> {
  const result = await viewCall<unknown>("get_all_pools_public", []);
  return ensureArray<RemedyPool>(result);
}

export async function getMerchantProfile(merchant: string): Promise<{
  display_name: string;
  public_slug: string;
  status: string;
} | null> {
  const result = await viewCall<unknown>("get_merchant_profile", [merchant]);
  if (!result || result === "" || result === "null") return null;
  if (typeof result === "object") return result as { display_name: string; public_slug: string; status: string };
  return null;
}

// ─── Write methods ────────────────────────────────────────────────────────────

export async function registerMerchant(
  from: string,
  displayName: string,
  publicSlug: string
): Promise<string> {
  return sendTx(from, "register_merchant", [displayName, publicSlug]);
}

export async function createPool(
  from: string,
  title: string,
  category: string,
  policySummary: string,
  policyHash: string,
  publicPolicyUrl: string,
  minClaimAmount: bigint,
  maxClaimAmount: bigint,
  claimWindowSeconds: bigint
): Promise<string> {
  return sendTx(from, "create_pool", [
    title, category, policySummary, policyHash, publicPolicyUrl,
    minClaimAmount.toString(), maxClaimAmount.toString(), claimWindowSeconds.toString(),
  ]);
}

export async function fundPool(
  from: string,
  poolId: string,
  amountWei: bigint
): Promise<string> {
  return sendTx(from, "fund_pool", [poolId, amountWei.toString()]);
}

export async function submitClaim(
  from: string,
  poolId: string,
  publicRef: string,
  claimSummary: string,
  requestedAmount: bigint,
  privateEvidenceHash: string,
  publicEvidenceUrl: string
): Promise<string> {
  return sendTx(from, "submit_claim", [
    poolId, publicRef, claimSummary,
    requestedAmount.toString(), privateEvidenceHash, publicEvidenceUrl,
  ]);
}

export async function respondToClaim(
  from: string,
  claimId: string,
  responseHash: string,
  responseSummary: string,
  publicResponseUrl: string
): Promise<string> {
  return sendTx(from, "respond_to_claim", [claimId, responseHash, responseSummary, publicResponseUrl]);
}

export async function offerSettlement(
  from: string,
  claimId: string,
  amount: bigint,
  reason: string
): Promise<string> {
  return sendTx(from, "offer_settlement", [claimId, amount.toString(), reason]);
}

export async function acceptSettlement(from: string, claimId: string): Promise<string> {
  return sendTx(from, "accept_settlement", [claimId]);
}

export async function rejectSettlement(from: string, claimId: string): Promise<string> {
  return sendTx(from, "reject_settlement", [claimId]);
}

export async function requestReview(from: string, claimId: string): Promise<string> {
  return sendTx(from, "request_review", [claimId]);
}

export async function resolveClaim(from: string, claimId: string): Promise<string> {
  return sendTx(from, "resolve_claim", [claimId]);
}

export async function claimPayout(from: string, claimId: string): Promise<string> {
  return sendTx(from, "claim_payout", [claimId]);
}

export async function withdrawAvailable(
  from: string,
  poolId: string,
  amount: bigint
): Promise<string> {
  return sendTx(from, "withdraw_available", [poolId, amount.toString()]);
}

export async function pausePool(from: string, poolId: string): Promise<string> {
  return sendTx(from, "pause_pool", [poolId]);
}

export async function resumePool(from: string, poolId: string): Promise<string> {
  return sendTx(from, "resume_pool", [poolId]);
}

export async function addClaimantResponse(
  from: string,
  claimId: string,
  responseHash: string,
  responseSummary: string,
  publicResponseUrl: string
): Promise<string> {
  return sendTx(from, "add_claimant_response", [claimId, responseHash, responseSummary, publicResponseUrl]);
}

// Admin
export async function approveMerchant(from: string, merchant: string): Promise<string> {
  return sendTx(from, "approve_merchant", [merchant]);
}

export async function disableMerchant(from: string, merchant: string, reason: string): Promise<string> {
  return sendTx(from, "disable_merchant", [merchant, reason]);
}

export async function setPlatformPaused(from: string, paused: boolean): Promise<string> {
  return sendTx(from, "set_platform_paused", [paused]);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatGEN(wei: number | bigint): string {
  const n = typeof wei === "bigint" ? wei : BigInt(Math.floor(wei));
  const whole = n / BigInt(1e18);
  const frac = n % BigInt(1e18);
  const fracStr = frac.toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr} GEN` : `${whole} GEN`;
}

export function weiFromGEN(gen: string): bigint {
  const n = parseFloat(gen);
  if (isNaN(n)) return 0n;
  return BigInt(Math.floor(n * 1e18));
}

export const VERDICT_LABELS: Record<string, string> = {
  NO_FAILURE: "No Failure Detected",
  QUALIFYING_FAILURE: "Qualifying Failure",
  PARTIAL_FAILURE: "Partial Failure",
  MERCHANT_NOT_RESPONSIBLE: "Merchant Not Responsible",
  EXCLUDED_BY_POLICY: "Excluded by Policy",
  INSUFFICIENT_EVIDENCE: "Insufficient Evidence",
  CLAIMANT_FAULT: "Claimant Fault",
  DUPLICATE_OR_ABUSIVE: "Duplicate or Abusive",
  MANUAL_REVIEW: "Manual Review Required",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  merchant_response_pending: "Awaiting Merchant Response",
  ready_for_review: "Ready for Review",
  reviewing: "Diagnosis in Progress",
  approved: "Approved",
  partially_approved: "Partially Approved",
  rejected: "Rejected",
  excluded: "Excluded by Policy",
  unverifiable: "Unverifiable",
  manual_review: "Manual Review",
  paid: "Remedy Paid",
  cancelled: "Cancelled",
};
