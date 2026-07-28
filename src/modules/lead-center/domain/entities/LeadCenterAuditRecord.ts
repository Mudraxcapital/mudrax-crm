// ============================================================================
// src/modules/lead-center/domain/entities/LeadCenterAuditRecord.ts
// ============================================================================

export const LEAD_CENTER_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type LeadCenterActorType = (typeof LEAD_CENTER_ACTOR_TYPES)[number];

export interface LeadCenterAuditActor {
  type: LeadCenterActorType;
  id?: string | null;
}

export interface LeadCenterAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: LeadCenterActorType;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}
