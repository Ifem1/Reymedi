"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ClinicShell } from "@/components/ClinicShell";
import { ReservedFundsMeter } from "@/components/ReservedFundsMeter";
import { GENEscrowRail } from "@/components/GENEscrowRail";
import { ClaimTriageCard } from "@/components/ClaimTriageCard";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  getPool, getPoolClaimsForMerchant, RemedyPool, Claim,
  fundPool, withdrawAvailable, pausePool, resumePool, weiFromGEN, formatGEN,
} from "@/lib/contract";
import { Loader, RefreshCw } from "lucide-react";

export default function MerchantPoolPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const { address, connected } = useWallet();
  const [pool, setPool] = useState<RemedyPool | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setLoadError(null);
    try {
      const p = await getPool(poolId);
      if (!p || typeof p !== "object" || !("pool_id" in p)) {
        setLoadError("Pool not yet visible — GenLayer may still be finalizing. Click retry in a moment.");
      } else {
        setPool(p);
        // Load claims separately — view auth may fail on gen_call; swallow the error
        try {
          const c = await getPoolClaimsForMerchant(poolId);
          setClaims(c);
        } catch {
          setClaims([]);
        }
      }
    } catch (e: unknown) {
      setLoadError((e as Error).message ?? "Failed to load pool.");
    } finally {
      setLoading(false);
    }
  }, [poolId, address]);

  useEffect(() => { load(); }, [load]);

  async function doAction(fn: () => Promise<string>, msg: string) {
    setActionLoading(true);
    setFeedback(null);
    try {
      await fn();
      setFeedback(msg + " Waiting for GenLayer to finalize…");
      const prevDeposited = pool?.total_deposited;
      let attempts = 0;
      const poll = async () => {
        try {
          await load();
          if (pool?.total_deposited !== prevDeposited || attempts > 10) {
            setFeedback(msg);
            return;
          }
        } catch { /* ignore */ }
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

  const activeClaims = claims.filter((c) =>
    !["paid", "rejected", "cancelled", "excluded"].includes(c.status)
  );

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!connected && (
          <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>Connect your wallet to manage this pool.</p>
        )}

        {connected && loading && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Loading pool…</span>
          </div>
        )}

        {loadError && (
          <div className="py-12 space-y-3">
            <p className="text-sm" style={{ color: "var(--triage-coral)" }}>{loadError}</p>
            <button
              onClick={load}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--muted-graphite)" }}>
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {pool && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
                  REMEDY BOARD · Pool #{pool.pool_id}
                </div>
                <h1 className="font-display text-4xl font-semibold">{pool.title}</h1>
                <p className="text-sm mt-1" style={{ color: "var(--muted-graphite)" }}>{pool.category}</p>
              </div>

              {/* Balance */}
              <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-xs font-mono font-medium mb-4" style={{ color: "var(--muted-graphite)" }}>
                  POOL HEALTH
                </div>
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Total deposited", val: formatGEN(pool.total_deposited) },
                    { label: "Available", val: formatGEN(pool.available_balance), color: "var(--remedy-green)" },
                    { label: "Reserved", val: formatGEN(pool.reserved_balance), color: "var(--soft-amber)" },
                    { label: "Paid out", val: formatGEN(pool.paid_balance) },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="text-xs mb-0.5" style={{ color: "var(--muted-graphite)" }}>{item.label}</div>
                      <div className="text-sm font-mono font-semibold" style={{ color: item.color ?? "var(--sterile-ink)" }}>
                        {item.val}
                      </div>
                    </div>
                  ))}
                </div>
                <ReservedFundsMeter
                  totalDeposited={pool.total_deposited}
                  availableBalance={pool.available_balance}
                  reservedBalance={pool.reserved_balance}
                  paidBalance={pool.paid_balance}
                />
              </div>

              {/* Claims */}
              <div>
                <div className="text-xs font-mono font-medium mb-3" style={{ color: "var(--muted-graphite)" }}>
                  ACTIVE CASES ({activeClaims.length})
                </div>
                {claims.length === 0 ? (
                  <div className="rounded-xl border p-8 text-center"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
                      Your remedy pool is funded, but no one has opened a case yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {claims.map((c) => (
                      <ClaimTriageCard key={c.claim_id} claim={c} role="merchant" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: controls */}
            <div className="space-y-4">
              <GENEscrowRail
                label="Fund this pool"
                actionLabel="Deposit GEN"
                hint="GEN is escrowed on-chain and reserved for valid claims."
                onSubmit={(wei) => doAction(() => fundPool(address!, poolId, wei), "Pool funded.")}
              />

              <div className="rounded-xl border p-5 space-y-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-xs font-mono font-medium mb-3" style={{ color: "var(--muted-graphite)" }}>
                  MERCHANT CONTROLS
                </div>

                {/* Withdraw */}
                <div className="space-y-2">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    id="withdraw-amount"
                    placeholder="Withdraw amount (GEN)"
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-mono border outline-none"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById("withdraw-amount") as HTMLInputElement;
                      const wei = weiFromGEN(el.value);
                      doAction(() => withdrawAvailable(address!, poolId, wei), "Withdrawal submitted.");
                    }}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: "var(--deep-teal)", color: "#fff" }}>
                    Withdraw unreserved GEN
                  </button>
                </div>

                {/* Pause / Resume */}
                {pool.status === "active" && (
                  <button
                    onClick={() => doAction(() => pausePool(address!, poolId), "Pool paused.")}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: "var(--surface-2)", color: "var(--muted-graphite)" }}>
                    Pause pool
                  </button>
                )}
                {pool.status === "paused" && (
                  <button
                    onClick={() => doAction(() => resumePool(address!, poolId), "Pool resumed.")}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: "var(--remedy-green)", color: "#fff" }}>
                    Resume pool
                  </button>
                )}
              </div>

              {feedback && (
                <p className="text-sm" style={{ color: "var(--remedy-green)" }}>{feedback}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
