// ============================================================================
// src/app/_lib/recentActivity.ts
//
// Composes the read-only Audit Trails already exposed by `leads`,
// `follow-ups`, and `campaigns` (each module's own `listRecentActivity`)
// into one chronological CRM Activity Timeline. This file intentionally
// lives outside `src/modules` — it is a presentation-layer composition
// over multiple modules' public APIs, not a new bounded context (no domain
// model, no repository, no writes, no audit log of its own).
//
// Next.js ignores route segments prefixed with `_`, so `_lib` is not routed.
// ============================================================================

// Thin adapter over `activity-timeline` for existing CRM dashboard imports.
import {
  listUnifiedTimeline,
  type TimelineEntry,
  type TimelineSources,
} from "@/modules/activity-timeline";

export type ActivitySource = TimelineEntry["source"];
export type ActivityEntry = TimelineEntry;
export type RecentActivitySources = TimelineSources;

export async function listRecentCrmActivity(
  organizationId: string,
  limit = 20,
  sources: RecentActivitySources = {},
): Promise<ActivityEntry[]> {
  return listUnifiedTimeline(organizationId, limit, sources);
}
