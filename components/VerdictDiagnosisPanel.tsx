import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { VerdictCode, PayoutBand, VERDICT_LABELS, formatGEN } from "@/lib/contract";

interface VerdictDiagnosisPanelProps {
  verdictCode: VerdictCode | null;
  payoutBand?: PayoutBand;
  payoutAmount?: number;
  confidence?: number;
  policyAlignment?: string;
  evidenceStrength?: string;
  merchantFault?: string;
  claimantImpact?: string;
  shortReason?: string;
}

const VERDICT_THEME: Record<string, { icon: React.ElementType; bg: string; color: string; border: string }> = {
  QUALIFYING_FAILURE: { icon: CheckCircle, bg: "var(--pale-mint)", color: "var(--remedy-green)", border: "#A7F3D0" },
  PARTIAL_FAILURE: { icon: CheckCircle, bg: "#FFFBEB", color: "var(--soft-amber)", border: "#FDE68A" },
  NO_FAILURE: { icon: XCircle, bg: "#FEF2F2", color: "var(--triage-coral)", border: "#FECACA" },
  MERCHANT_NOT_RESPONSIBLE: { icon: XCircle, bg: "#FEF2F2", color: "var(--triage-coral)", border: "#FECACA" },
  EXCLUDED_BY_POLICY: { icon: XCircle, bg: "#FEF2F2", color: "var(--triage-coral)", border: "#FECACA" },
  CLAIMANT_FAULT: { icon: XCircle, bg: "#FEF2F2", color: "var(--triage-coral)", border: "#FECACA" },
  DUPLICATE_OR_ABUSIVE: { icon: XCircle, bg: "#FEF2F2", color: "var(--triage-coral)", border: "#FECACA" },
  INSUFFICIENT_EVIDENCE: { icon: AlertCircle, bg: "#F5F3FF", color: "var(--private-plum)", border: "#DDD6FE" },
  MANUAL_REVIEW: { icon: Clock, bg: "#EFF6FF", color: "var(--case-blue)", border: "#BFDBFE" },
};

export function VerdictDiagnosisPanel({
  verdictCode,
  payoutAmount,
  confidence,
  policyAlignment,
  evidenceStrength,
  merchantFault,
  claimantImpact,
  shortReason,
}: VerdictDiagnosisPanelProps) {
  if (!verdictCode) {
    return (
      <div className="rounded-xl p-6 border text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <Clock size={24} className="mx-auto mb-2" style={{ color: "var(--muted-graphite)" }} />
        <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>Diagnosis pending</p>
      </div>
    );
  }

  const theme = VERDICT_THEME[verdictCode] ?? VERDICT_THEME.MANUAL_REVIEW;
  const Icon = theme.icon;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.border }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3" style={{ background: theme.bg }}>
        <Icon size={20} style={{ color: theme.color }} />
        <div>
          <div className="text-xs font-mono font-medium mb-0.5" style={{ color: theme.color }}>
            VERDICT DIAGNOSIS
          </div>
          <div className="font-display font-semibold" style={{ color: theme.color }}>
            {VERDICT_LABELS[verdictCode] ?? verdictCode}
          </div>
        </div>
        {confidence !== undefined && (
          <div className="ml-auto text-right">
            <div className="text-xs" style={{ color: theme.color }}>Confidence</div>
            <div className="font-mono font-semibold" style={{ color: theme.color }}>{confidence}%</div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4" style={{ background: "var(--surface)" }}>
        {shortReason && (
          <p className="text-sm" style={{ color: "var(--sterile-ink)" }}>{shortReason}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {policyAlignment && (
            <DiagRow label="Policy alignment" value={policyAlignment} />
          )}
          {evidenceStrength && (
            <DiagRow label="Evidence strength" value={evidenceStrength} />
          )}
          {merchantFault && (
            <DiagRow label="Merchant fault" value={merchantFault} />
          )}
          {claimantImpact && (
            <DiagRow label="Claimant impact" value={claimantImpact} />
          )}
        </div>

        {payoutAmount !== undefined && payoutAmount > 0 && (
          <div className="rounded-lg px-4 py-3 mt-2"
            style={{ background: "var(--pale-mint)", border: "1px solid #A7F3D0" }}>
            <div className="text-xs mb-1" style={{ color: "var(--deep-teal)" }}>Approved remedy</div>
            <div className="font-mono font-bold text-lg" style={{ color: "var(--remedy-green)" }}>
              {formatGEN(payoutAmount)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs mb-0.5 capitalize" style={{ color: "var(--muted-graphite)" }}>{label}</div>
      <div className="text-sm font-medium capitalize">{value}</div>
    </div>
  );
}
