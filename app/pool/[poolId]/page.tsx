"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ClinicShell } from "@/components/ClinicShell";
import { ReservedFundsMeter } from "@/components/ReservedFundsMeter";
import { PolicyScopeMap } from "@/components/PolicyScopeMap";
import { getPool, RemedyPool, formatGEN } from "@/lib/contract";
import { useWallet } from "@/lib/hooks/useWallet";
import { Loader, ArrowRight, RefreshCw } from "lucide-react";

export default function PoolPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const { connected } = useWallet();
  const [pool, setPool] = useState<RemedyPool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPool(poolId)
      .then((p) => {
        // pool returns empty string if not yet visible to gen_call
        if (!p || typeof p !== "object" || !("pool_id" in p)) {
          setError("Pool not yet visible on-chain — GenLayer may still be finalizing. Try refreshing in a moment.");
        } else {
          setPool(p);
        }
      })
      .catch((e) => setError(e.message ?? "Pool not found"))
      .finally(() => setLoading(false));
  }, [poolId, retries]);

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex items-center gap-2 py-12" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Loading pool…</span>
          </div>
        )}

        {error && (
          <div className="py-12 space-y-3">
            <p className="text-sm" style={{ color: "var(--triage-coral)" }}>{error}</p>
            <button
              onClick={() => setRetries(r => r + 1)}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--muted-graphite)" }}>
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {pool && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: pool info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
                  REMEDY POOL · #{pool.pool_id}
                </div>
                <h1 className="font-display text-4xl font-semibold mb-1">{pool.title}</h1>
                <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>{pool.category}</p>
              </div>

              <PolicyScopeMap
                summary={pool.policy_summary}
                policyUrl={pool.public_policy_url || undefined}
              />

              <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-xs font-mono font-medium mb-4" style={{ color: "var(--muted-graphite)" }}>
                  POOL BALANCE
                </div>
                <ReservedFundsMeter
                  totalDeposited={pool.total_deposited}
                  availableBalance={pool.available_balance}
                  reservedBalance={pool.reserved_balance}
                  paidBalance={pool.paid_balance}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--muted-graphite)" }}>Min claim</div>
                  <div className="font-mono font-semibold">{formatGEN(BigInt(pool.min_claim_amount))}</div>
                </div>
                <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--muted-graphite)" }}>Max claim</div>
                  <div className="font-mono font-semibold">{formatGEN(BigInt(pool.max_claim_amount))}</div>
                </div>
              </div>
            </div>

            {/* Right: action */}
            <div className="space-y-4">
              <div className="rounded-2xl border p-6 sticky top-6"
                style={{ background: "var(--sterile-ink)", borderColor: "var(--border)" }}>
                <div className="text-xs font-mono mb-1" style={{ color: "var(--muted-graphite)" }}>
                  INTAKE BAY
                </div>
                <h2 className="font-display text-xl font-semibold mb-3" style={{ color: "var(--clinic-porcelain)" }}>
                  Open a remedy case
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--muted-graphite)" }}>
                  Submit your evidence and request a remedy. GEN is reserved from the pool while your case is under diagnosis.
                </p>

                {pool.status !== "active" ? (
                  <div className="rounded-lg p-3 text-sm text-center"
                    style={{ background: "#FEF3C7", color: "#92400E" }}>
                    This pool is {pool.status}. New claims cannot be opened.
                  </div>
                ) : connected ? (
                  <Link
                    href={`/claim/new/${pool.pool_id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
                    style={{ background: "var(--remedy-green)", color: "#fff" }}>
                    Open a remedy case
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <p className="text-sm text-center" style={{ color: "var(--muted-graphite)" }}>
                    Connect your wallet to open a case.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
