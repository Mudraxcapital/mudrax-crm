// ============================================================================
// src/modules/campaigns/domain/entities/CampaignAuditRecord.ts
//
// One immutable, append-only fact about a change to a campaigns module
// aggregate (Campaign, CampaignMembership, CampaignAssignment) — the
// canonical Audit Record shape platform-contracts.md §4 requires of every
// module-owned audit record (identical shape to
// organization.OrganizationAuditRecord).
// ============================================================================

export const CAMPAIGN_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type CampaignActorType = (typeof CAMPAIGN_ACTOR_TYPES)[number];

export interface CampaignAuditActor {
  actorType: CampaignActorType;
  actorId: string | null;
}

export interface CampaignAuditRecord {
  id: string;
  organizationId: string;
  occurredAt: Date;
  actorType: CampaignActorType;
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
