"use client";

import { useEffect, useState } from "react";
import { ClinicShell } from "@/components/ClinicShell";
import { RemedyPoolCard } from "@/components/RemedyPoolCard";
import { getAllPoolsPublic, RemedyPool } from "@/lib/contract";
import { Loader, SearchX } from "lucide-react";

export default function PoolsPage() {
  const [pools, setPools] = useState<RemedyPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllPoolsPublic()
      .then(setPools)
      .catch((e) => setError(e.message ?? "Failed to load pools"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
            INTAKE BAY
          </div>
          <h1 className="font-display text-4xl font-semibold mb-2">Remedy Pools</h1>
          <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
            Browse active remedy pools. Select a pool to open a case.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Loading pools from StudioNet…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-6 border text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--triage-coral)" }}>{error}</p>
          </div>
        )}

        {!loading && !error && pools.length === 0 && (
          <div className="rounded-2xl border p-16 flex flex-col items-center justify-center text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <SearchX size={32} className="mb-4" style={{ color: "var(--muted-graphite)" }} />
            <p className="font-display font-semibold mb-1">No claims in diagnosis.</p>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              No active remedy pools found on StudioNet. Merchants can create one from the Merchant Room.
            </p>
          </div>
        )}

        {!loading && pools.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool) => (
              <RemedyPoolCard key={pool.pool_id} pool={pool} />
            ))}
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
