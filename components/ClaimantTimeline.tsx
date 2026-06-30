import { CheckCircle, Circle, Clock } from "lucide-react";
import { ClaimStatus } from "@/lib/contract";

const STAGES: { status: ClaimStatus[]; label: string; description: string }[] = [
  {
    status: ["submitted", "merchant_response_pending"],
    label: "Case opened",
    description: "Your claim has entered the intake bay.",
  },
  {
    status: ["merchant_response_pending"],
    label: "Awaiting merchant",
    description: "The clinic is waiting for the merchant response.",
  },
  {
    status: ["ready_for_review"],
    label: "Ready for diagnosis",
    description: "All materials are collected. Forwarding to GenLayer.",
  },
  {
    status: ["reviewing"],
    label: "Diagnosis in progress",
    description: "GenLayer validators are evaluating your case.",
  },
  {
    status: ["approved", "partially_approved", "rejected", "excluded", "unverifiable", "manual_review"],
    label: "Verdict issued",
    description: "The diagnostic report is ready.",
  },
  {
    status: ["paid"],
    label: "Remedy paid",
    description: "GEN has been transferred to your wallet.",
  },
];

const STATUS_ORDER: ClaimStatus[] = [
  "draft", "submitted", "merchant_response_pending", "ready_for_review",
  "reviewing", "approved", "partially_approved", "paid",
];

function stageIndex(status: ClaimStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

interface ClaimantTimelineProps {
  currentStatus: ClaimStatus;
}

export function ClaimantTimeline({ currentStatus }: ClaimantTimelineProps) {
  const currentIdx = stageIndex(currentStatus);

  return (
    <div className="space-y-0">
      {STAGES.map((stage, i) => {
        const stageIdx = stageIndex(stage.status[0]);
        const done = currentIdx > stageIdx;
        const active = stage.status.includes(currentStatus);

        return (
          <div key={i} className="flex gap-3">
            {/* Icon col */}
            <div className="flex flex-col items-center">
              <div className="mt-0.5">
                {done ? (
                  <CheckCircle size={16} style={{ color: "var(--remedy-green)" }} />
                ) : active ? (
                  <Clock size={16} style={{ color: "var(--case-blue)" }} />
                ) : (
                  <Circle size={16} style={{ color: "var(--border)" }} />
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div className="w-px flex-1 my-1" style={{ background: done ? "var(--remedy-green)" : "var(--border)", minHeight: 20 }} />
              )}
            </div>

            {/* Content */}
            <div className="pb-5">
              <div
                className="text-sm font-medium"
                style={{ color: done || active ? "var(--sterile-ink)" : "var(--muted-graphite)" }}>
                {stage.label}
              </div>
              {active && (
                <div className="text-xs mt-0.5" style={{ color: "var(--muted-graphite)" }}>
                  {stage.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
