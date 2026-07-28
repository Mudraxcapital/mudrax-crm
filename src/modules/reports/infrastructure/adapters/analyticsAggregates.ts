// ============================================================================
// src/modules/reports/infrastructure/adapters/analyticsAggregates.ts
//
// Pure helpers that shape live module projections into Analytics KPI series.
// Kept framework-free so adapter tests can cover mapping without Prisma.
// ============================================================================

import type { LeadDto } from "@/modules/leads";
import type { LeadTrendGranularity, NamedCount } from "../../application/ports/SourceDataPort";

const FUNNEL_STEPS: Array<{ key: string; label: string; match: (name: string) => boolean }> = [
  {
    key: "fresh",
    label: "Fresh",
    match: (name) => /^(fresh|new)$/i.test(name.trim()),
  },
  {
    key: "contacted",
    label: "Contacted",
    match: (name) => /^contacted$/i.test(name.trim()) || /\bcontacted\b/i.test(name),
  },
  {
    key: "interested",
    label: "Interested",
    match: (name) => /^interested$/i.test(name.trim()),
  },
  {
    key: "documents",
    label: "Documents",
    match: (name) => /document/i.test(name),
  },
  {
    key: "approved",
    label: "Approved",
    match: (name) => /approv/i.test(name) || /submitted to bank/i.test(name),
  },
  {
    key: "disbursed",
    label: "Disbursed",
    match: (name) => /disburs/i.test(name) || /^won$/i.test(name.trim()),
  },
];

export function buildConversionFunnel(
  leadsByStatus: Array<{ key: string; label: string; count: number }>,
): NamedCount[] {
  return FUNNEL_STEPS.map((step) => {
    const count = leadsByStatus
      .filter((entry) => {
        const stageName = entry.label.replace(/\s*\([^)]*\)\s*$/, "").trim();
        return step.match(stageName);
      })
      .reduce((sum, entry) => sum + entry.count, 0);
    return { key: step.key, label: step.label, count };
  });
}

export function resolveTrendGranularity(
  dateFrom: Date | null,
  dateTo: Date,
): LeadTrendGranularity {
  if (!dateFrom) return "weekly";
  const days = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / 86_400_000));
  if (days <= 14) return "daily";
  if (days <= 90) return "weekly";
  return "monthly";
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function bucketKey(date: Date, granularity: LeadTrendGranularity): string {
  const day = startOfUtcDay(date);
  if (granularity === "daily") {
    return day.toISOString().slice(0, 10);
  }
  if (granularity === "monthly") {
    return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  // ISO week bucket (Monday start)
  const weekday = day.getUTCDay() || 7;
  const monday = new Date(day);
  monday.setUTCDate(day.getUTCDate() - (weekday - 1));
  return `W${monday.toISOString().slice(0, 10)}`;
}

function bucketLabel(key: string, granularity: LeadTrendGranularity): string {
  if (granularity === "daily") return key;
  if (granularity === "monthly") return key;
  return key.replace(/^W/, "Week ");
}

export function buildLeadTrend(
  leads: LeadDto[],
  dateFrom: Date | null,
  dateTo: Date,
  granularity: LeadTrendGranularity,
): NamedCount[] {
  const fromMs = dateFrom ? dateFrom.getTime() : null;
  const toMs = dateTo.getTime();
  const counts = new Map<string, number>();

  for (const lead of leads) {
    const created = new Date(lead.createdAt);
    const ms = created.getTime();
    if (Number.isNaN(ms)) continue;
    if (fromMs != null && ms < fromMs) continue;
    if (ms > toMs) continue;
    const key = bucketKey(created, granularity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({
      key,
      label: bucketLabel(key, granularity),
      count,
    }));
}

export function buildTopPerformingUsers(
  leads: LeadDto[],
  userNames: Map<string, string>,
  limit = 10,
): NamedCount[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const userId = lead.currentAssigneeUserId;
    if (!userId) continue;
    counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, count]) => ({
      key: userId,
      label: userNames.get(userId)?.trim() || "Unknown",
      count,
    }));
}

export function buildSourceConversions(leads: LeadDto[], limit = 10): NamedCount[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const lead of leads) {
    if (!lead.wonAt) continue;
    const existing = counts.get(lead.leadSourceId) ?? {
      label: lead.leadSourceName,
      count: 0,
    };
    existing.count += 1;
    counts.set(lead.leadSourceId, existing);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([sourceId, value]) => ({
      key: sourceId,
      label: value.label,
      count: value.count,
    }));
}

export function isSameUtcDay(iso: string | null, day: Date): boolean {
  if (!iso) return false;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return false;
  return startOfUtcDay(value).getTime() === startOfUtcDay(day).getTime();
}

export function countInLastDays(
  leads: LeadDto[],
  field: "createdAt" | "wonAt",
  days: number,
  now: Date,
): number {
  const from = now.getTime() - days * 86_400_000;
  let count = 0;
  for (const lead of leads) {
    const iso = lead[field];
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms) && ms >= from && ms <= now.getTime()) count += 1;
  }
  return count;
}
