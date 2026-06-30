import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { RemedyPool, formatGEN } from "@/lib/contract";

interface RemedyPoolCardProps {
  pool: RemedyPool;
  href?: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: "var(--pale-mint)", color: "var(--remedy-green)" },
  paused: { bg: "#FEF3C7", color: "#92400E" },
  draft: { bg: "var(--surface-2)", color: "var(--muted-graphite)" },
  closed: { bg: "#F3F4F6", color: "#6B7280" },
  closing: { bg: "#FEF3C7", color: "#92400E" },
};

export function RemedyPoolCard({ pool, href }: RemedyPoolCardProps) {
  const statusStyle = STATUS_COLORS[pool.status] ?? STATUS_COLORS.draft;
  const linkHref = href ?? `/pool/${pool.pool_id}`;

  return (
    <Link href={linkHref} className="block group">
      <div
        className="rounded-2xl p-6 border transition-shadow hover:shadow-md"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--pale-mint)" }}>
              <Shield size={18} style={{ color: "var(--remedy-green)" }} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base leading-tight">{pool.title}</h3>
              <span className="text-xs" style={{ color: "var(--muted-graphite)" }}>{pool.category}</span>
            </div>
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
            style={{ background: statusStyle.bg, color: statusStyle.color }}>
            {pool.status}
          </span>
        </div>

        <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--muted-graphite)" }}>
          {pool.policy_summary}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted-graphite)" }}>Funded</div>
            <div className="text-sm font-mono font-medium">{formatGEN(pool.total_deposited)}</div>
          </div>
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted-graphite)" }}>Available</div>
            <div className="text-sm font-mono font-medium" style={{ color: "var(--remedy-green)" }}>
              {formatGEN(pool.available_balance)}
            </div>
          </div>
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted-graphite)" }}>Paid Out</div>
            <div className="text-sm font-mono font-medium">{formatGEN(pool.paid_balance)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: "var(--muted-graphite)" }}>
            Claims up to {formatGEN(BigInt(pool.max_claim_amount))}
          </div>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5"
            style={{ color: "var(--muted-graphite)" }} />
        </div>
      </div>
    </Link>
  );
}
