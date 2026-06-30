import { formatGEN } from "@/lib/contract";

interface ReservedFundsMeterProps {
  totalDeposited: number;
  availableBalance: number;
  reservedBalance: number;
  paidBalance: number;
}

export function ReservedFundsMeter({
  totalDeposited,
  availableBalance,
  reservedBalance,
  paidBalance,
}: ReservedFundsMeterProps) {
  const total = totalDeposited || 1;
  const availPct = (availableBalance / total) * 100;
  const resvPct = (reservedBalance / total) * 100;
  const paidPct = (paidBalance / total) * 100;

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full transition-all"
          style={{ width: `${availPct}%`, background: "var(--remedy-green)" }}
        />
        <div
          className="h-full transition-all"
          style={{ width: `${resvPct}%`, background: "var(--soft-amber)" }}
        />
        <div
          className="h-full transition-all"
          style={{ width: `${paidPct}%`, background: "var(--muted-graphite)" }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <LegendItem color="var(--remedy-green)" label="Available" value={formatGEN(availableBalance)} />
        <LegendItem color="var(--soft-amber)" label="Reserved" value={formatGEN(reservedBalance)} />
        <LegendItem color="var(--muted-graphite)" label="Paid Out" value={formatGEN(paidBalance)} />
        <LegendItem color="var(--sterile-ink)" label="Total Funded" value={formatGEN(totalDeposited)} />
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <div>
        <div className="text-xs" style={{ color: "var(--muted-graphite)" }}>{label}</div>
        <div className="text-xs font-mono font-medium">{value}</div>
      </div>
    </div>
  );
}
