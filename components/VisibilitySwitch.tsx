"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface VisibilitySwitchProps {
  label?: string;
  defaultVisible?: boolean;
  children: React.ReactNode;
  redactedText?: string;
}

export function VisibilitySwitch({
  label = "Reveal private content",
  defaultVisible = false,
  children,
  redactedText = "This content is private to the case room.",
}: VisibilitySwitchProps) {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div>
      <button
        onClick={() => setVisible((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium mb-2 transition-opacity hover:opacity-70"
        style={{ color: "var(--muted-graphite)" }}>
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
        {visible ? "Hide" : label}
      </button>
      {visible ? (
        children
      ) : (
        <div
          className="rounded-lg p-4 text-sm italic"
          style={{ background: "var(--surface-2)", color: "var(--muted-graphite)", border: "1px dashed var(--border)" }}>
          {redactedText}
        </div>
      )}
    </div>
  );
}
