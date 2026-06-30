"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClinicShell } from "@/components/ClinicShell";
import { ClaimTriageCard } from "@/components/ClaimTriageCard";
import { useWallet } from "@/lib/hooks/useWallet";
import { getClaimantClaims, Claim } from "@/lib/contract";
import { Loader, FileText } from "lucide-react";

export default function MePage() {
  const { address, connected } = useWallet();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getClaimantClaims(address)
      .then(setClaims)
      .catch((e) => setError(e.message ?? "Failed to load claims"))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
            MY CASES
          </div>
          <h1 className="font-display text-4xl font-semibold">Your remedy cases</h1>
          {address && (
            <p className="text-xs font-mono mt-2" style={{ color: "var(--muted-graphite)" }}>
              {address}
            </p>
          )}
        </div>

        {!connected && (
          <div className="rounded-2xl border p-12 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <FileText size={32} className="mx-auto mb-4" style={{ color: "var(--muted-graphite)" }} />
            <p className="font-display font-semibold mb-1">Connect your wallet</p>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              Your personal case dashboard is personalised to your connected wallet.
            </p>
          </div>
        )}

        {connected && loading && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Loading your cases…</span>
          </div>
        )}

        {connected && error && (
          <p className="text-sm" style={{ color: "var(--triage-coral)" }}>{error}</p>
        )}

        {connected && !loading && claims.length === 0 && (
          <div className="rounded-2xl border p-12 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="font-display font-semibold mb-1">No claims in diagnosis.</p>
            <p className="text-sm mb-6" style={{ color: "var(--muted-graphite)" }}>
              You have no active remedy cases. Browse pools to open one.
            </p>
            <Link
              href="/pools"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
              Browse remedy pools
            </Link>
          </div>
        )}

        {connected && !loading && claims.length > 0 && (
          <div className="space-y-4">
            {claims.map((claim) => (
              <ClaimTriageCard key={claim.claim_id} claim={claim} role="claimant" />
            ))}
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
