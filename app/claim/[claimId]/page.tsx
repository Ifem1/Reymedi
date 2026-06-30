"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ClinicShell } from "@/components/ClinicShell";
import { ClaimantTimeline } from "@/components/ClaimantTimeline";
import { VerdictDiagnosisPanel } from "@/components/VerdictDiagnosisPanel";
import { PayoutTheatre } from "@/components/PayoutTheatre";
import { EvidenceSampleCard } from "@/components/EvidenceSampleCard";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  getClaimPrivate, Claim, CLAIM_STATUS_LABELS, formatGEN,
  requestReview, acceptSettlement, rejectSettlement, resolveClaim,
} from "@/lib/contract";
import { Loader, AlertCircle } from "lucide-react";

export default function ClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const { address, connected } = useWallet();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadClaim = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const c = await getClaimPrivate(claimId, address);
      setClaim(c);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Could not load claim");
    } finally {
      setLoading(false);
    }
  }, [claimId, address]);

  useEffect(() => { loadClaim(); }, [loadClaim]);

  async function doAction(action: () => Promise<string>, msg: string) {
    if (!address) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await action();
      setFeedback(msg + " Waiting for GenLayer to finalize…");
      const prevStatus = claim?.status;
      let attempts = 0;
      const poll = async () => {
        try {
          const c = await getClaimPrivate(claimId, address);
          setClaim(c);
          if (c.status !== prevStatus || attempts > 10) {
            setFeedback(msg);
            return;
          }
        } catch { /* ignore read errors during polling */ }
        attempts++;
        setTimeout(poll, 3000);
      };
      setTimeout(poll, 4000);
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? "Action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  const isClaimant = address?.toLowerCase() === claim?.claimant?.toLowerCase();

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!connected && (
          <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              Connect your wallet to view your case.
            </p>
          </div>
        )}

        {connected && loading && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Loading case file…</span>
          </div>
        )}

        {connected && error && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--triage-coral)" }}>
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {claim && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: main claim */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-xs font-mono" style={{ color: "var(--muted-graphite)" }}>
                    CASE #{claim.claim_id} · Pool #{claim.pool_id}
                  </div>
                  <PrivacyBadge level="private" label="Private case room" />
                </div>
                <h1 className="font-display text-3xl font-semibold mb-2">{claim.claim_summary}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: "var(--muted-graphite)" }}>
                    {CLAIM_STATUS_LABELS[claim.status]}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--muted-graphite)" }}>
                    Ref: {claim.public_ref}
                  </span>
                </div>
              </div>

              {/* Evidence Lab */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono font-medium" style={{ color: "var(--muted-graphite)" }}>
                    EVIDENCE LAB
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {claim.public_evidence_url && (
                    <EvidenceSampleCard
                      label="Public evidence sample"
                      url={claim.public_evidence_url}
                      privacy="public"
                      description="Publicly visible to validators and merchant."
                    />
                  )}
                  {claim.private_evidence_hash && claim.private_evidence_hash !== "0x" && (
                    <EvidenceSampleCard
                      label="Private evidence hash"
                      hash={claim.private_evidence_hash}
                      privacy="shared"
                      description="Hash of private evidence. Full file is private to case room."
                    />
                  )}
                  {!claim.public_evidence_url && !claim.private_evidence_hash && (
                    <div className="rounded-xl border p-4 text-sm italic col-span-2"
                      style={{ borderColor: "var(--border)", color: "var(--muted-graphite)" }}>
                      This evidence is private to the case room.
                    </div>
                  )}
                </div>
              </div>

              {/* Merchant response */}
              {claim.merchant_response_summary && (
                <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-xs font-mono font-medium mb-3" style={{ color: "var(--muted-graphite)" }}>
                    MERCHANT RESPONSE
                  </div>
                  <p className="text-sm">{claim.merchant_response_summary}</p>
                  {claim.merchant_response_url && (
                    <a href={claim.merchant_response_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs mt-2 inline-block transition-opacity hover:opacity-70"
                      style={{ color: "var(--case-blue)" }}>
                      View response evidence →
                    </a>
                  )}
                </div>
              )}

              {/* Settlement offer */}
              {claim.settlement_pending && claim.settlement_offer_amount && isClaimant && (
                <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                  <div className="text-xs font-mono font-medium mb-3" style={{ color: "var(--soft-amber)" }}>
                    SETTLEMENT OFFER
                  </div>
                  <p className="text-sm mb-3">
                    The merchant has offered {formatGEN(claim.settlement_offer_amount)} GEN as a settlement.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => doAction(() => acceptSettlement(address!, claim.claim_id), "Settlement accepted.")}
                      disabled={actionLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: "var(--remedy-green)", color: "#fff" }}>
                      Accept settlement
                    </button>
                    <button
                      onClick={() => doAction(() => rejectSettlement(address!, claim.claim_id), "Settlement rejected. Forwarding to GenLayer review.")}
                      disabled={actionLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: "var(--triage-coral)", color: "#fff" }}>
                      Reject — request diagnosis
                    </button>
                  </div>
                </div>
              )}

              {/* Request review */}
              {isClaimant && claim.status === "ready_for_review" && !claim.settlement_pending && (
                <button
                  onClick={() => doAction(() => requestReview(address!, claim.claim_id), "Case forwarded to GenLayer diagnosis.")}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "var(--case-blue)", color: "#fff" }}>
                  {actionLoading && <Loader size={14} className="animate-spin" />}
                  Request GenLayer diagnosis
                </button>
              )}

              {/* Resolve (any connected wallet for demo — in prod restrict to validator role) */}
              {claim.status === "ready_for_review" && (
                <button
                  onClick={() => doAction(() => resolveClaim(address!, claim.claim_id), "Diagnosis initiated on-chain.")}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--deep-teal)", color: "#fff" }}>
                  Trigger GenLayer resolve
                </button>
              )}

              {feedback && (
                <p className="text-sm" style={{ color: "var(--remedy-green)" }}>{feedback}</p>
              )}

              {/* Verdict */}
              <VerdictDiagnosisPanel
                verdictCode={claim.verdict_code ?? null}
                payoutAmount={claim.final_payout_amount}
              />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-xs font-mono font-medium mb-4" style={{ color: "var(--muted-graphite)" }}>
                  CASE TIMELINE
                </div>
                <ClaimantTimeline currentStatus={claim.status} />
              </div>

              <PayoutTheatre
                claim={claim}
                connectedAddress={address}
                onPaid={loadClaim}
              />
            </div>
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
