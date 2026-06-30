import { ExternalLink, FileText, Hash } from "lucide-react";
import { PrivacyBadge } from "./PrivacyBadge";

interface EvidenceSampleCardProps {
  label: string;
  hash?: string;
  url?: string;
  privacy: "public" | "private" | "shared";
  description?: string;
}

export function EvidenceSampleCard({ label, hash, url, privacy, description }: EvidenceSampleCardProps) {
  return (
    <div
      className="rounded-xl p-4 border animate-clinic-in"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--surface-2)" }}>
            <FileText size={14} style={{ color: "var(--muted-graphite)" }} />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <PrivacyBadge level={privacy} />
      </div>

      {description && (
        <p className="text-xs mb-3" style={{ color: "var(--muted-graphite)" }}>{description}</p>
      )}

      {hash && (
        <div className="flex items-center gap-2 text-xs font-mono mb-2 overflow-hidden"
          style={{ color: "var(--muted-graphite)" }}>
          <Hash size={10} />
          <span className="truncate">{hash}</span>
        </div>
      )}

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: "var(--case-blue)" }}>
          <ExternalLink size={10} />
          View evidence sample
        </a>
      )}
    </div>
  );
}
