import { ExternalLink, ShieldCheck } from "lucide-react";
import { VERDICT_LABELS, formatGEN } from "@/lib/contract";
import { EXPLORER_URL } from "@/lib/chain";
import { PrivacyBadge } from "./PrivacyBadge";

interface PublicProofReceiptProps {
  claimId: string | number;
  verdictCode: string;
  payoutAmount?: number;
  resolvedAt?: string | number;
  txHash?: string;
  anonymised?: boolean;
}

export function PublicProofReceipt({
  claimId,
  verdictCode,
  payoutAmount,
  resolvedAt,
  txHash,
  anonymised = true,
}: PublicProofReceiptProps) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3"
        style={{ background: "var(--sterile-ink)" }}>
        <ShieldCheck size={20} style={{ color: "var(--remedy-green)" }} />
        <div className="flex-1">
          <div className="text-xs font-mono mb-0.5" style={{ color: "var(--muted-graphite)" }}>
            PROOF RECEIPT · Case #{claimId}
          </div>
          <div className="font-display font-semibold" style={{ color: "var(--clinic-porcelain)" }}>
            {VERDICT_LABELS[verdictCode] ?? verdictCode}
          </div>
        </div>
        <PrivacyBadge level={anonymised ? "private" : "public"} label={anonymised ? "Anonymised" : "Public"} />
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4" style={{ background: "var(--surface)" }}>
        <p className="text-xs" style={{ color: "var(--muted-graphite)" }}>
          {anonymised
            ? "This proof receipt is anonymised. Claimant identity and private evidence are redacted."
            : "This proof receipt is public. The claimant has chosen to publish full case details."}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted-graphite)" }}>Verdict</div>
            <div className="text-sm font-medium">{VERDICT_LABELS[verdictCode] ?? verdictCode}</div>
          </div>
          {payoutAmount !== undefined && payoutAmount > 0 && (
            <div>
              <div className="text-xs mb-0.5" style={{ color: "var(--muted-graphite)" }}>Remedy paid</div>
              <div className="text-sm font-mono font-semibold" style={{ color: "var(--remedy-green)" }}>
                {formatGEN(payoutAmount)}
              </div>
            </div>
          )}
          {resolvedAt && (
            <div>
              <div className="text-xs mb-0.5" style={{ color: "var(--muted-graphite)" }}>Resolved</div>
              <div className="text-sm">{resolvedAt === "resolved" ? "Resolved" : new Date(Number(resolvedAt) * 1000).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        {txHash && txHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
          <a
            href={`${EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--case-blue)" }}>
            <ExternalLink size={10} />
            View on StudioNet Explorer
          </a>
        )}
      </div>
    </div>
  );
}
