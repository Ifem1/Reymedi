"use client";

import { useState } from "react";
import { Coins, Loader } from "lucide-react";
import { weiFromGEN } from "@/lib/contract";

interface GENEscrowRailProps {
  label: string;
  actionLabel: string;
  onSubmit: (amountWei: bigint) => Promise<void>;
  maxGEN?: string;
  hint?: string;
}

export function GENEscrowRail({ label, actionLabel, onSubmit, maxGEN, hint }: GENEscrowRailProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!value || parseFloat(value) <= 0) {
      setError("Enter a valid GEN amount.");
      return;
    }
    const wei = weiFromGEN(value);
    setLoading(true);
    try {
      await onSubmit(wei);
      setTxHash("submitted");
      setValue("");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Coins size={16} style={{ color: "var(--remedy-green)" }} />
        <span className="text-sm font-semibold">{label}</span>
      </div>

      {hint && (
        <p className="text-xs mb-4" style={{ color: "var(--muted-graphite)" }}>{hint}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="number"
            step="0.0001"
            min="0"
            max={maxGEN}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.0000"
            className="w-full rounded-lg px-4 py-3 pr-16 font-mono text-sm border outline-none focus:ring-2"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border)",
              color: "var(--sterile-ink)",
            }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
            style={{ color: "var(--muted-graphite)" }}>
            GEN
          </span>
        </div>

        {maxGEN && (
          <button
            type="button"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--case-blue)" }}
            onClick={() => setValue(maxGEN)}>
            Use max: {maxGEN} GEN
          </button>
        )}

        {error && (
          <p className="text-xs" style={{ color: "var(--triage-coral)" }}>{error}</p>
        )}

        {txHash && (
          <p className="text-xs" style={{ color: "var(--remedy-green)" }}>
            Transaction submitted. Awaiting confirmation.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "var(--remedy-green)", color: "#fff" }}>
          {loading && <Loader size={14} className="animate-spin" />}
          {loading ? "Sending GEN…" : actionLabel}
        </button>
      </form>
    </div>
  );
}
