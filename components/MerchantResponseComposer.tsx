"use client";

import { useState } from "react";
import { Send, Loader, FileText } from "lucide-react";
import { respondToClaim, offerSettlement, weiFromGEN } from "@/lib/contract";

interface MerchantResponseComposerProps {
  claimId: string;
  connectedAddress: string;
  reservedAmount: number;
  onSubmitted?: () => void;
}

type Mode = "respond" | "settle";

export function MerchantResponseComposer({
  claimId,
  connectedAddress,
  onSubmitted,
}: Omit<MerchantResponseComposerProps, "reservedAmount"> & { reservedAmount?: number }) {
  const [mode, setMode] = useState<Mode>("respond");
  const [summary, setSummary] = useState("");
  const [responseUrl, setResponseUrl] = useState("");
  const [responseHash, setResponseHash] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementReason, setSettlementReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "respond") {
        await respondToClaim(connectedAddress, claimId, responseHash || "0x", summary, responseUrl);
      } else {
        const wei = weiFromGEN(settlementAmount);
        await offerSettlement(connectedAddress, claimId, wei, settlementReason);
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border p-5 text-center" style={{ background: "var(--pale-mint)", borderColor: "#A7F3D0" }}>
        <p className="text-sm font-medium" style={{ color: "var(--remedy-green)" }}>
          {mode === "respond" ? "Merchant response submitted." : "Settlement offer submitted to claimant."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} style={{ color: "var(--case-blue)" }} />
        <span className="text-sm font-semibold">Merchant Response Room</span>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-lg overflow-hidden border mb-5" style={{ borderColor: "var(--border)" }}>
        {(["respond", "settle"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="flex-1 py-2 text-xs font-medium transition-colors"
            style={{
              background: mode === m ? "var(--sterile-ink)" : "var(--surface-2)",
              color: mode === m ? "var(--clinic-porcelain)" : "var(--muted-graphite)",
            }}>
            {m === "respond" ? "Submit Response" : "Offer Settlement"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "respond" ? (
          <>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the merchant's position on this claim. What happened from your side?"
              rows={4}
              required
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none resize-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
            <input
              value={responseUrl}
              onChange={(e) => setResponseUrl(e.target.value)}
              placeholder="Public response URL (optional)"
              className="w-full rounded-lg px-4 py-2.5 text-sm border outline-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
            <input
              value={responseHash}
              onChange={(e) => setResponseHash(e.target.value)}
              placeholder="Evidence hash (optional, keccak256)"
              className="w-full rounded-lg px-4 py-2.5 text-sm border outline-none font-mono"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
          </>
        ) : (
          <>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                placeholder="Settlement amount"
                required
                className="w-full rounded-lg px-4 py-3 pr-16 font-mono text-sm border outline-none"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                style={{ color: "var(--muted-graphite)" }}>GEN</span>
            </div>
            <textarea
              value={settlementReason}
              onChange={(e) => setSettlementReason(e.target.value)}
              placeholder="Reason for this settlement offer…"
              rows={3}
              required
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none resize-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
          </>
        )}

        {error && (
          <p className="text-xs" style={{ color: "var(--triage-coral)" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "var(--case-blue)", color: "#fff" }}>
          {loading && <Loader size={14} className="animate-spin" />}
          {loading ? "Submitting…" : <><Send size={14} /> {mode === "respond" ? "Submit Response" : "Send Settlement Offer"}</>}
        </button>
      </form>
    </div>
  );
}
