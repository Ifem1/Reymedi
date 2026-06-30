"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClinicShell } from "@/components/ClinicShell";
import { useWallet } from "@/lib/hooks/useWallet";
import { submitClaim, weiFromGEN } from "@/lib/contract";
import { Loader, FlaskConical } from "lucide-react";

export default function NewClaimPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const { address, connected } = useWallet();
  const router = useRouter();

  const [summary, setSummary] = useState("");
  const [publicRef, setPublicRef] = useState("");
  const [amount, setAmount] = useState("");
  const [evidenceHash, setEvidenceHash] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !connected) {
      setError("Connect your wallet first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const amountWei = weiFromGEN(amount);
      await submitClaim(
        address,
        poolId,
        publicRef,
        summary,
        amountWei,
        evidenceHash || "0x",
        evidenceUrl
      );
      router.push("/me");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ClinicShell>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
            INTAKE BAY · Pool #{poolId}
          </div>
          <h1 className="font-display text-4xl font-semibold mb-2">Open a remedy case</h1>
          <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
            Describe the service failure. Submit your evidence sample. Request a remedy amount.
            GEN will be reserved from the pool while your case is under diagnosis.
          </p>
        </div>

        {!connected && (
          <div className="rounded-xl border p-6 text-center mb-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              Wallet not connected. Please connect to open a case.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Evidence Lab header */}
          <div className="flex items-center gap-2 pt-2">
            <FlaskConical size={16} style={{ color: "var(--case-blue)" }} />
            <span className="text-sm font-semibold">Evidence Lab</span>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-graphite)" }}>
              Case reference (public) *
            </label>
            <input
              value={publicRef}
              onChange={(e) => setPublicRef(e.target.value)}
              required
              placeholder="e.g. Order #12345 or Booking ABC-999"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-graphite)" }}>
              Claim summary — describe the service failure *
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              rows={5}
              placeholder="Describe what was promised, what failed, when it occurred, and how it affected you. Be specific."
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none resize-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted-graphite)" }}>
              This summary is shared with the merchant and validators.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-graphite)" }}>
              Evidence URL (public, optional)
            </label>
            <input
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://… screenshot, incident report, support ticket link"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-graphite)" }}>
              Private evidence hash (optional — keccak256 of your private file)
            </label>
            <input
              value={evidenceHash}
              onChange={(e) => setEvidenceHash(e.target.value)}
              placeholder="0x…"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none font-mono"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted-graphite)" }}>
              Store sensitive files privately. Only the hash is recorded on-chain.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-graphite)" }}>
              Requested remedy amount (GEN) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.0000"
                className="w-full rounded-lg px-4 py-3 pr-16 text-sm border outline-none font-mono"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                style={{ color: "var(--muted-graphite)" }}>GEN</span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--muted-graphite)" }}>
              This amount will be reserved from the pool until the case is resolved.
            </p>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--triage-coral)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !connected}
            className="w-full py-4 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
            {loading && <Loader size={16} className="animate-spin" />}
            {loading ? "Submitting case…" : "Submit remedy case"}
          </button>
        </form>
      </div>
    </ClinicShell>
  );
}
