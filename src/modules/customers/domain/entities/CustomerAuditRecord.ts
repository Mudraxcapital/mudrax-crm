// ============================================================================
// src/modules/customers/domain/entities/CustomerAuditRecord.ts
//
// One immutable, append-only fact about a change to a Customers module
// aggregate — the canonical Audit Record shape platform-contracts.md §4
// requires of every module-owned audit record (identical shape to
// organization.OrganizationAuditRecord). Framework-free.
// ============================================================================

export const CUSTOMER_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;

export type CustomerActorType = (typeof CUSTOMER_ACTOR_TYPES)[number];

export interface CustomerAuditActor {
  actorType: CustomerActorType;
  actorId: string | null;
}

export interface CustomerAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: CustomerActorType;
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
