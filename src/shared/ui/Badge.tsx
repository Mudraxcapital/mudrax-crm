import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-muted border-border",
  accent: "bg-accent-muted text-accent border-transparent",
  success: "bg-success-muted text-success border-transparent",
  warning: "bg-warning-muted text-warning border-transparent",
  danger: "bg-danger-muted text-danger border-transparent",
  info: "bg-info-muted text-info border-transparent",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight",
        toneClass[tone],
        className,
      )}
    >
      {dot ? (
        <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (/(^active$|open|won|approved|sent|connected|verified|completed|success|live)/.test(s))
    return "success";
  if (/(suspended|pending|draft|queued|new|review|hold)/.test(s)) return "warning";
  if (
    /(disabled|lost|failed|rejected|closed|inactive|missed|error|cancelled|canceled)/.test(s)
  )
    return "danger";
  if (/(progress|running|in_?progress|processing)/.test(s)) return "info";
  return "neutral";
}

/** Account status badges — Active / Disabled / Suspended / Locked. */
export function accountStatusTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "success";
  if (s === "SUSPENDED" || s === "LOCKED") return "warning";
  return "danger";
}

export function accountStatusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "Active";
  if (s === "SUSPENDED") return "Suspended";
  if (s === "INACTIVE") return "Disabled";
  if (s === "LOCKED") return "Locked";
  return status;
}
