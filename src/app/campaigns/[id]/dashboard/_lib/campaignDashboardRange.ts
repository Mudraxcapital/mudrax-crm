// ============================================================================
// Server-safe date-range helpers for the Campaign Dashboard.
// ============================================================================

export const CAMPAIGN_DASHBOARD_RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
  { value: "all", label: "All time" },
] as const;

export type CampaignDashboardRange = (typeof CAMPAIGN_DASHBOARD_RANGES)[number]["value"];

export type CampaignProgressGranularity = "daily" | "weekly";

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveCampaignDashboardRange(
  raw: string | string[] | undefined,
): CampaignDashboardRange {
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    value === "today" ||
    value === "yesterday" ||
    value === "week" ||
    value === "month" ||
    value === "custom" ||
    value === "all"
  ) {
    return value;
  }
  return "month";
}

export function resolveProgressGranularity(
  raw: string | string[] | undefined,
): CampaignProgressGranularity {
  return raw === "weekly" ? "weekly" : "daily";
}

export function resolveRangeBounds(
  range: CampaignDashboardRange,
  options: {
    now?: Date;
    customFrom?: string | null;
    customTo?: string | null;
  } = {},
): { from: Date | null; to: Date } {
  const now = options.now ?? new Date();
  const to = endOfLocalDay(now);

  switch (range) {
    case "today":
      return { from: startOfLocalDay(now), to };
    case "yesterday": {
      const day = startOfLocalDay(now);
      day.setDate(day.getDate() - 1);
      return { from: day, to: endOfLocalDay(day) };
    }
    case "week": {
      const from = startOfLocalDay(now);
      const weekday = from.getDay() || 7;
      from.setDate(from.getDate() - (weekday - 1));
      return { from, to };
    }
    case "month": {
      const from = startOfLocalDay(now);
      from.setDate(1);
      return { from, to };
    }
    case "custom": {
      const fromRaw = options.customFrom ? new Date(options.customFrom) : null;
      const toRaw = options.customTo ? new Date(options.customTo) : now;
      const from =
        fromRaw && !Number.isNaN(fromRaw.getTime()) ? startOfLocalDay(fromRaw) : null;
      const end =
        toRaw && !Number.isNaN(toRaw.getTime()) ? endOfLocalDay(toRaw) : to;
      return { from, to: end };
    }
    case "all":
    default:
      return { from: null, to };
  }
}

export function descriptionMeta(description: string | null): {
  source: string;
  priority: string;
} {
  const lines = (description ?? "").split("\n");
  const source =
    lines
      .find((line) => line.toLowerCase().startsWith("source:"))
      ?.replace(/^source:\s*/i, "")
      .trim() || "—";
  const priority =
    lines
      .find((line) => line.toLowerCase().startsWith("priority:"))
      ?.replace(/^priority:\s*/i, "")
      .trim() || "—";
  return { source, priority };
}
