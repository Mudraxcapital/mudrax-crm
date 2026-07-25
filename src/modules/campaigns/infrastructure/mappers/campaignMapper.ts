// ============================================================================
// src/modules/campaigns/infrastructure/mappers/campaignMapper.ts
//
// Translates Prisma row shapes into framework-free domain entities — see
// organization's PrismaTeamRepository.ts's identical mapper convention.
// ============================================================================

import type {
  Campaign as PrismaCampaign,
  CampaignMembership as PrismaCampaignMembership,
  CampaignAssignment as PrismaCampaignAssignment,
  CampaignAssignmentAllocation as PrismaCampaignAssignmentAllocation,
  CampaignAuditLog as PrismaCampaignAuditLog,
} from "@prisma/client";
import type { Campaign, CampaignStatus } from "../../domain/entities/Campaign";
import type { CampaignMembership } from "../../domain/entities/CampaignMembership";
import type {
  AllocationMethod,
  CampaignAssignment,
  CampaignAssignmentAllocation,
  CampaignAssignmentStatus,
} from "../../domain/entities/CampaignAssignment";
import type {
  CampaignActorType,
  CampaignAuditRecord,
} from "../../domain/entities/CampaignAuditRecord";

export function toCampaign(row: PrismaCampaign): Campaign {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    status: row.status as CampaignStatus,
    startDate: row.startDate,
    endDate: row.endDate,
    createdByUserId: row.createdByUserId,
    ownerManagerId: row.ownerManagerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCampaignMembership(row: PrismaCampaignMembership): CampaignMembership {
  return {
    campaignId: row.campaignId,
    userId: row.userId,
    allocationWeight: Number(row.allocationWeight),
    isActive: row.isActive,
    joinedAt: row.joinedAt,
    leftAt: row.leftAt,
  };
}

export function toCampaignAssignment(row: PrismaCampaignAssignment): CampaignAssignment {
  return {
    id: row.id,
    campaignId: row.campaignId,
    initiatedByUserId: row.initiatedByUserId,
    allocationMethod: row.allocationMethod as AllocationMethod,
    targetLeadCount: row.targetLeadCount,
    status: row.status as CampaignAssignmentStatus,
    executedAt: row.executedAt,
    createdAt: row.createdAt,
  };
}

export function toCampaignAssignmentAllocation(
  row: PrismaCampaignAssignmentAllocation,
): CampaignAssignmentAllocation {
  return {
    id: row.id,
    campaignAssignmentId: row.campaignAssignmentId,
    userId: row.userId,
    allocatedPercentage: row.allocatedPercentage ? Number(row.allocatedPercentage) : null,
    allocatedCount: row.allocatedCount,
  };
}

export function toCampaignAuditRecord(row: PrismaCampaignAuditLog): CampaignAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType as CampaignActorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: (row.beforeState as Record<string, unknown> | null) ?? null,
    afterState: (row.afterState as Record<string, unknown> | null) ?? null,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}
