"use client";

import { useState } from "react";
import { Shield, Loader, AlertTriangle } from "lucide-react";
import { approveMerchant, disableMerchant, setPlatformPaused } from "@/lib/contract";
import { PublicStats } from "@/lib/contract";
import { formatGEN } from "@/lib/contract";

interface AdminRiskPanelProps {
  stats: PublicStats | null;
  connectedAddress: string;
  onAction?: () => void;
}

export function AdminRiskPanel({ stats, connectedAddress, onAction }: AdminRiskPanelProps) {
  const [merchantAddr, setMerchantAddr] = useState("");
  const [disableReason, setDisableReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handle(action: () => Promise<string>) {
    setFeedback(null);
    setLoading(true);
    try {
      await action();
      setFeedback("Action submitted successfully.");
      onAction?.();
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Pools" value={stats.total_pools.toString()} />
          <StatCard label="Active Pools" value={stats.active_pools.toString()} />
          <StatCard label="Total Claims" value={stats.total_claims.toString()} />
          <StatCard label="Total Paid" value={formatGEN(stats.total_paid_wei)} />
        </div>
      )}

      {/* Platform pause toggle */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} style={{ color: "var(--private-plum)" }} />
          <span className="text-sm font-semibold">Platform Controls</span>
          {stats?.platform_paused && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
              style={{ background: "#FEE2E2", color: "#991B1B" }}>
              PAUSED
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handle(() => setPlatformPaused(connectedAddress, true))}
            disabled={loading || stats?.platform_paused}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "var(--triage-coral)", color: "#fff" }}>
            Pause Platform
          </button>
          <button
            onClick={() => handle(() => setPlatformPaused(connectedAddress, false))}
            disabled={loading || !stats?.platform_paused}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "var(--remedy-green)", color: "#fff" }}>
            Resume Platform
          </button>
        </div>
      </div>

      {/* Merchant management */}
      <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} style={{ color: "var(--soft-amber)" }} />
          <span className="text-sm font-semibold">Merchant Management</span>
        </div>

        <div className="space-y-3">
          <input
            value={merchantAddr}
            onChange={(e) => setMerchantAddr(e.target.value)}
            placeholder="Merchant wallet address (0x…)"
            className="w-full rounded-lg px-4 py-2.5 text-sm font-mono border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
          />
          <input
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
            placeholder="Disable reason (only needed for disable)"
            className="w-full rounded-lg px-4 py-2.5 text-sm border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => handle(() => approveMerchant(connectedAddress, merchantAddr))}
              disabled={loading || !merchantAddr}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--remedy-green)", color: "#fff" }}>
              {loading ? <Loader size={12} className="animate-spin mx-auto" /> : "Approve Merchant"}
            </button>
            <button
              onClick={() => handle(() => disableMerchant(connectedAddress, merchantAddr, disableReason))}
              disabled={loading || !merchantAddr || !disableReason}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--triage-coral)", color: "#fff" }}>
              Disable Merchant
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <p className="text-sm" style={{ color: "var(--remedy-green)" }}>{feedback}</p>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="text-xs mb-1" style={{ color: "var(--muted-graphite)" }}>{label}</div>
      <div className="font-mono font-semibold text-base">{value}</div>
    </div>
  );
}
