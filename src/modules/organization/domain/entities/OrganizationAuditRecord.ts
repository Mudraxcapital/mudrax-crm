// ============================================================================
// src/modules/organization/domain/entities/OrganizationAuditRecord.ts
//
// One immutable, append-only fact about a change to an Organization module
// aggregate (starting with Organization itself) — the canonical Audit
// Record shape platform-contracts.md §4 requires of every module-owned
// audit record. Framework-free: no Prisma types leak past
// infrastructure/mappers.
// ============================================================================

export const ORGANIZATION_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;

export type OrganizationActorType = (typeof ORGANIZATION_ACTOR_TYPES)[number];

export interface OrganizationAuditActor {
  actorType: OrganizationActorType;
  actorId: string | null;
}

/** Input for recording a new Audit Record — `recordHash`/`previousRecordHash` are computed by the database's hash-chain trigger, never by the application. */
export interface RecordOrganizationAuditEntryInput extends OrganizationAuditActor {
  /** The Organization the audited change belongs to (platform-contracts.md §4 `organizationId`). */
  organizationId: string;
  action: string;
  targetType: string;
  targetId: string;
  correlationId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

export interface OrganizationAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: OrganizationActorType;
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
