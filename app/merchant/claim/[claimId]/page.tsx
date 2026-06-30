"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ClinicShell } from "@/components/ClinicShell";
import { VerdictDiagnosisPanel } from "@/components/VerdictDiagnosisPanel";
import { MerchantResponseComposer } from "@/components/MerchantResponseComposer";
import { EvidenceSampleCard } from "@/components/EvidenceSampleCard";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { useWallet } from "@/lib/hooks/useWallet";
import { getClaimPrivate, Claim, CLAIM_STATUS_LABELS, formatGEN } from "@/lib/contract";
import { Loader } from "lucide-react";

export default function MerchantClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const { address, connected } = useWallet();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const c = await getClaimPrivate(claimId, address);
      setClaim(c);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Could not load claim.");
    } finally {
      setLoading(false);
    }
  }, [claimId, address]);

  useEffect(() => { load(); }, [load]);

  function pollAfterAction(prevStatus: string) {
    let attempts = 0;
    const poll = async () => {
      try {
        const c = await getClaimPrivate(claimId, address!);
        setClaim(c);
        if (c.status !== prevStatus || attempts > 10) return;
      } catch { /* ignore */ }
      attempts++;
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 4000);
  }

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!connected && (
          <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>Connect your merchant wallet to view this case.</p>
        )}

        {connected && loading && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
          </div>
        )}

        {error && <p className="text-sm py-8" style={{ color: "var(--triage-coral)" }}>{error}</p>}

        {claim && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-xs font-mono" style={{ color: "var(--muted-graphite)" }}>
                    CASE #{claim.claim_id} · MERCHANT VIEW
                  </div>
                  <PrivacyBadge level="shared" label="Case room only" />
                </div>
                <h1 className="font-display text-3xl font-semibold mb-1">{claim.claim_summary}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm" style={{ color: "var(--muted-graphite)" }}>
                    {CLAIM_STATUS_LABELS[claim.status]}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--muted-graphite)" }}>
                    Ref: {claim.public_ref}
                  </span>
                  <span className="text-xs font-mono font-semibold" style={{ color: "var(--soft-amber)" }}>
                    {formatGEN(claim.requested_amount)} requested
                  </span>
                </div>
              </div>

              {/* Evidence from claimant */}
              <div>
                <div className="text-xs font-mono font-medium mb-3" style={{ color: "var(--muted-graphite)" }}>
                  CLAIMANT EVIDENCE
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {claim.public_evidence_url && (
                    <EvidenceSampleCard
                      label="Public evidence"
                      url={claim.public_evidence_url}
                      privacy="public"
                    />
                  )}
                  {claim.private_evidence_hash && claim.private_evidence_hash !== "0x" && (
                    <EvidenceSampleCard
                      label="Private evidence hash"
                      hash={claim.private_evidence_hash}
                      privacy="shared"
                      description="Claimant private file. Only the hash is on-chain."
                    />
                  )}
                </div>
              </div>

              {/* Claimant response */}
              {claim.claimant_response_summary && (
                <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-xs font-mono font-medium mb-3" style={{ color: "var(--muted-graphite)" }}>
                    CLAIMANT RESPONSE
                  </div>
                  <p className="text-sm">{claim.claimant_response_summary}</p>
                </div>
              )}

              {/* Verdict */}
              <VerdictDiagnosisPanel
                verdictCode={claim.verdict_code ?? null}
                payoutAmount={claim.final_payout_amount}
              />
            </div>

            {/* Right: response composer */}
            <div className="space-y-4">
              {claim.status === "merchant_response_pending" && address && (
                <MerchantResponseComposer
                  claimId={claim.claim_id}
                  connectedAddress={address}
                  reservedAmount={claim.reserved_amount}
                  onSubmitted={() => { load(); pollAfterAction(claim.status); }}
                />
              )}

              {/* Amounts summary */}
              <div className="rounded-xl border p-5 space-y-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-xs font-mono font-medium" style={{ color: "var(--muted-graphite)" }}>
                  CASE FINANCIALS
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Requested", val: formatGEN(claim.requested_amount) },
                    { label: "GEN reserved for this case", val: formatGEN(claim.reserved_amount), color: "var(--soft-amber)" },
                    ...(claim.final_payout_amount > 0
                      ? [{ label: "Approved remedy", val: formatGEN(claim.final_payout_amount), color: "var(--remedy-green)" }]
                      : []),
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--muted-graphite)" }}>{row.label}</span>
                      <span className="text-xs font-mono font-semibold" style={{ color: row.color ?? "var(--sterile-ink)" }}>
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
