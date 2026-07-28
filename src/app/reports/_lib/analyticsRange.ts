// ============================================================================
// Server-safe analytics range helpers (no "use client").
// ============================================================================

export const ANALYTICS_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]["value"];

export function resolveAnalyticsRange(
  raw: string | string[] | undefined,
): AnalyticsRange {
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "7d" || value === "90d") return value;
  return "30d";
}

export function rangeToDateFrom(range: AnalyticsRange, now = new Date()): Date {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(now.getTime() - days * 86_400_000);
}
