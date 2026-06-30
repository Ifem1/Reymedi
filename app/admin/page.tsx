"use client";

import { useEffect, useState } from "react";
import { ClinicShell } from "@/components/ClinicShell";
import { AdminRiskPanel } from "@/components/AdminRiskPanel";
import { useWallet } from "@/lib/hooks/useWallet";
import { getPublicStats, PublicStats } from "@/lib/contract";
import { Loader, ShieldAlert } from "lucide-react";

export default function AdminPage() {
  const { address, connected } = useWallet();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
            ADMIN CONSOLE
          </div>
          <h1 className="font-display text-4xl font-semibold flex items-center gap-3">
            <ShieldAlert size={28} style={{ color: "var(--private-plum)" }} />
            Platform controls
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--muted-graphite)" }}>
            Admin-only controls. Only the contract admin address can execute these actions.
          </p>
        </div>

        {!connected && (
          <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              Connect the admin wallet to access platform controls.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
          </div>
        )}

        {connected && address && (
          <AdminRiskPanel
            stats={stats}
            connectedAddress={address}
            onAction={() => getPublicStats().then(setStats).catch(() => {})}
          />
        )}
      </div>
    </ClinicShell>
  );
}
