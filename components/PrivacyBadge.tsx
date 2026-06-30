import { Lock, Globe, Users } from "lucide-react";

type PrivacyLevel = "public" | "private" | "shared";

interface PrivacyBadgeProps {
  level: PrivacyLevel;
  label?: string;
}

const CONFIG = {
  public: {
    icon: Globe,
    label: "Public",
    bg: "var(--pale-mint)",
    color: "var(--deep-teal)",
  },
  private: {
    icon: Lock,
    label: "Private",
    bg: "#EDE9F6",
    color: "var(--private-plum)",
  },
  shared: {
    icon: Users,
    label: "Case Room Only",
    bg: "#EEF1FF",
    color: "var(--case-blue)",
  },
};

export function PrivacyBadge({ level, label }: PrivacyBadgeProps) {
  const cfg = CONFIG[level];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={10} />
      {label ?? cfg.label}
    </span>
  );
}
