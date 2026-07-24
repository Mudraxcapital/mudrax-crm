// ============================================================================
// src/modules/leads/domain/entities/LeadAuditRecord.ts
//
// One immutable, append-only fact about a change to a Leads module
// aggregate (Lead, LeadAssignment, LeadNote) — the canonical Audit Record
// shape platform-contracts.md §4 requires of every module-owned audit
// record (identical shape to organization.OrganizationAuditRecord).
// ============================================================================

export const LEAD_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;

export type LeadActorType = (typeof LEAD_ACTOR_TYPES)[number];

export interface LeadAuditActor {
  actorType: LeadActorType;
  actorId: string | null;
}

export interface LeadAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: LeadActorType;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  recordHash: string;
  previousRecordHash: string | null;
}
