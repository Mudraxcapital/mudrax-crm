// Public API of the `activity-timeline` module.
//
// Read-composition over module-owned Audit Trails (no separate write model /
// Prisma schema — LeadAuditLog etc. are the backing store).

export {
  listUnifiedTimeline,
  listCustomerTimeline,
  type TimelineEntry,
  type TimelineSource,
  type TimelineSources,
} from "./application/use-cases/listUnifiedTimeline";
