import { CheckCircle, XCircle } from "lucide-react";

interface PolicyScopeMapProps {
  summary: string;
  covered?: string[];
  excluded?: string[];
  policyUrl?: string;
}

export function PolicyScopeMap({ summary, covered = [], excluded = [], policyUrl }: PolicyScopeMapProps) {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div>
        <div className="text-xs font-mono font-medium mb-2" style={{ color: "var(--muted-graphite)" }}>
          POLICY SCOPE
        </div>
        <p className="text-sm">{summary}</p>
      </div>

      {covered.length > 0 && (
        <div>
          <div className="text-xs mb-2 font-medium" style={{ color: "var(--remedy-green)" }}>Covered</div>
          <ul className="space-y-1">
            {covered.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs">
                <CheckCircle size={12} style={{ color: "var(--remedy-green)", flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {excluded.length > 0 && (
        <div>
          <div className="text-xs mb-2 font-medium" style={{ color: "var(--triage-coral)" }}>Excluded</div>
          <ul className="space-y-1">
            {excluded.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs">
                <XCircle size={12} style={{ color: "var(--triage-coral)", flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {policyUrl && (
        <a
          href={policyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "var(--case-blue)" }}>
          Read full policy →
        </a>
      )}
    </div>
  );
}
