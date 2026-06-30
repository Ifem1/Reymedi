"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClinicShell } from "@/components/ClinicShell";
import { PublicProofReceipt } from "@/components/PublicProofReceipt";
import { getClaimPublic } from "@/lib/contract";
import { Loader } from "lucide-react";

export default function ProofPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const [claim, setClaim] = useState<Awaited<ReturnType<typeof getClaimPublic>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClaimPublic(claimId)
      .then(setClaim)
      .catch((e) => setError(e.message ?? "Claim not found"))
      .finally(() => setLoading(false));
  }, [claimId]);

  return (
    <ClinicShell>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
            PUBLIC PROOF
          </div>
          <h1 className="font-display text-3xl font-semibold">Anonymised proof receipt</h1>
          <p className="text-sm mt-2" style={{ color: "var(--muted-graphite)" }}>
            This page shows a public summary of the verdict. Private claim details are not visible here.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Loading proof receipt…</span>
          </div>
        )}

        {error && <p className="text-sm" style={{ color: "var(--triage-coral)" }}>{error}</p>}

        {claim && (
          <PublicProofReceipt
            claimId={claim.claim_id ?? claimId}
            verdictCode={claim.verdict_code ?? "MANUAL_REVIEW"}
            payoutAmount={claim.final_payout_amount}
            resolvedAt={claim.resolved_at ?? undefined}
            anonymised={true}
          />
        )}
      </div>
    </ClinicShell>
  );
}
