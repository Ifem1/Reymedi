import Link from "next/link";
import { Clock, AlertCircle, CheckCircle, XCircle, Loader } from "lucide-react";
import { Claim, CLAIM_STATUS_LABELS, formatGEN } from "@/lib/contract";

interface ClaimTriageCardProps {
  claim: Claim;
  href?: string;
  role?: "claimant" | "merchant";
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  approved: CheckCircle,
  partially_approved: CheckCircle,
  paid: CheckCircle,
  rejected: XCircle,
  excluded: XCircle,
  reviewing: Loader,
  merchant_response_pending: Clock,
  ready_for_review: Clock,
  manual_review: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  approved: "var(--remedy-green)",
  partially_approved: "var(--soft-amber)",
  paid: "var(--remedy-green)",
  rejected: "var(--triage-coral)",
  excluded: "var(--triage-coral)",
  reviewing: "var(--case-blue)",
  merchant_response_pending: "var(--soft-amber)",
  ready_for_review: "var(--case-blue)",
  manual_review: "var(--private-plum)",
};

export function ClaimTriageCard({ claim, href, role = "claimant" }: ClaimTriageCardProps) {
  const StatusIcon = STATUS_ICONS[claim.status] ?? AlertCircle;
  const statusColor = STATUS_COLORS[claim.status] ?? "var(--muted-graphite)";
  const linkHref = href ?? (role === "merchant" ? `/merchant/claim/${claim.claim_id}` : `/claim/${claim.claim_id}`);

  return (
    <Link href={linkHref} className="block group">
      <div
        className="rounded-xl p-5 border transition-shadow hover:shadow-sm"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xs font-mono mb-1" style={{ color: "var(--muted-graphite)" }}>
              Case #{claim.claim_id}
            </div>
            <p className="text-sm font-medium line-clamp-2">{claim.claim_summary}</p>
          </div>
          <StatusIcon size={16} style={{ color: statusColor, flexShrink: 0, marginTop: 2 }} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: statusColor, fontWeight: 500 }}>
            {CLAIM_STATUS_LABELS[claim.status] ?? claim.status}
          </span>
          <div className="text-xs font-mono" style={{ color: "var(--muted-graphite)" }}>
            {formatGEN(claim.requested_amount)} requested
          </div>
        </div>

        {claim.final_payout_amount > 0 && (
          <div className="mt-2 pt-2 border-t flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--muted-graphite)" }}>Approved remedy</span>
            <span className="text-xs font-mono font-semibold" style={{ color: "var(--remedy-green)" }}>
              {formatGEN(claim.final_payout_amount)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
