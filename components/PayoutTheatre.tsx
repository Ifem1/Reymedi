"use client";

import { useState } from "react";
import { Coins, Loader, ExternalLink, CheckCircle } from "lucide-react";
import { Claim, formatGEN, claimPayout } from "@/lib/contract";
import { EXPLORER_URL } from "@/lib/chain";

interface PayoutTheatreProps {
  claim: Claim;
  connectedAddress: string | null;
  onPaid?: () => void;
}

export function PayoutTheatre({ claim, connectedAddress, onPaid }: PayoutTheatreProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isClaimant = connectedAddress?.toLowerCase() === claim.claimant.toLowerCase();
  const canClaim =
    isClaimant &&
    (claim.status === "approved" || claim.status === "partially_approved") &&
    !claim.paid_at &&
    claim.final_payout_amount > 0;

  async function handleClaim() {
    if (!connectedAddress) return;
    setError(null);
    setLoading(true);
    try {
      const hash = await claimPayout(connectedAddress, claim.claim_id);
      setTxHash(hash);
      onPaid?.();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      {/* Theatre header */}
      <div className="px-6 py-4" style={{ background: "var(--sterile-ink)" }}>
        <div className="text-xs font-mono mb-1" style={{ color: "var(--muted-graphite)" }}>
          PAYOUT THEATRE
        </div>
        <div className="font-display text-lg font-semibold" style={{ color: "var(--clinic-porcelain)" }}>
          GEN Remedy Settlement
        </div>
      </div>

      <div className="p-6 space-y-5" style={{ background: "var(--surface)" }}>
        {/* Amount breakdown */}
        <div className="space-y-3">
          <AmountRow label="Requested amount" value={formatGEN(claim.requested_amount)} />
          <AmountRow label="GEN reserved for this case" value={formatGEN(claim.reserved_amount)} highlight />
          {claim.final_payout_amount > 0 && (
            <AmountRow
              label="Approved remedy"
              value={formatGEN(claim.final_payout_amount)}
              color="var(--remedy-green)"
              large
            />
          )}
        </div>

        {/* Status */}
        {claim.status === "paid" && (
          <div className="flex items-center gap-2 rounded-lg p-3"
            style={{ background: "var(--pale-mint)" }}>
            <CheckCircle size={16} style={{ color: "var(--remedy-green)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--remedy-green)" }}>
              Remedy paid{claim.paid_at && claim.paid_at !== "paid" ? ` on ${new Date(Number(claim.paid_at) * 1000).toLocaleDateString()}` : ""}
            </span>
          </div>
        )}

        {canClaim && !txHash && (
          <>
            {error && (
              <p className="text-xs" style={{ color: "var(--triage-coral)" }}>{error}</p>
            )}
            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--remedy-green)", color: "#fff" }}>
              {loading ? <Loader size={16} className="animate-spin" /> : <Coins size={16} />}
              {loading ? "Processing payout…" : `Claim ${formatGEN(claim.final_payout_amount)}`}
            </button>
          </>
        )}

        {txHash && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: "var(--remedy-green)" }}>
              Payout transaction submitted.
            </p>
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--case-blue)" }}>
              <ExternalLink size={10} />
              View on StudioNet Explorer
            </a>
          </div>
        )}

        {!canClaim && claim.status !== "paid" && (
          <p className="text-sm text-center" style={{ color: "var(--muted-graphite)" }}>
            {claim.status === "reviewing" || claim.status === "ready_for_review"
              ? "Diagnosis in progress. Payout available after approval."
              : claim.status === "rejected"
              ? "This claim was not approved for a remedy."
              : "No GEN is reserved for this claim yet."}
          </p>
        )}
      </div>
    </div>
  );
}

function AmountRow({
  label, value, highlight, color, large,
}: {
  label: string; value: string; highlight?: boolean; color?: string; large?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${highlight ? "px-3 py-2 rounded-lg" : ""}`}
      style={highlight ? { background: "var(--surface-2)" } : {}}>
      <span className="text-xs" style={{ color: "var(--muted-graphite)" }}>{label}</span>
      <span
        className={`font-mono font-semibold ${large ? "text-base" : "text-sm"}`}
        style={{ color: color ?? "var(--sterile-ink)" }}>
        {value}
      </span>
    </div>
  );
}
