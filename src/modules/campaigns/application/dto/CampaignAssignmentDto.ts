// ============================================================================
// src/modules/campaigns/application/dto/CampaignAssignmentDto.ts
// ============================================================================

import type {
  CampaignAssignment,
  CampaignAssignmentAllocation,
} from "../../domain/entities/CampaignAssignment";

export interface CampaignAssignmentAllocationDto {
  id: string;
  campaignAssignmentId: string;
  userId: string;
  allocatedPercentage: number | null;
  allocatedCount: number | null;
}

export interface CampaignAssignmentDto {
  id: string;
  campaignId: string;
  initiatedByUserId: string;
  allocationMethod: CampaignAssignment["allocationMethod"];
  targetLeadCount: number;
  status: CampaignAssignment["status"];
  executedAt: string | null;
  createdAt: string;
  allocations: CampaignAssignmentAllocationDto[];
}

export function toCampaignAssignmentAllocationDto(
  allocation: CampaignAssignmentAllocation,
): CampaignAssignmentAllocationDto {
  return {
    id: allocation.id,
    campaignAssignmentId: allocation.campaignAssignmentId,
    userId: allocation.userId,
    allocatedPercentage: allocation.allocatedPercentage,
    allocatedCount: allocation.allocatedCount,
  };
}

export function toCampaignAssignmentDto(
  assignment: CampaignAssignment,
  allocations: CampaignAssignmentAllocation[],
): CampaignAssignmentDto {
  return {
    id: assignment.id,
    campaignId: assignment.campaignId,
    initiatedByUserId: assignment.initiatedByUserId,
    allocationMethod: assignment.allocationMethod,
    targetLeadCount: assignment.targetLeadCount,
    status: assignment.status,
    executedAt: assignment.executedAt ? assignment.executedAt.toISOString() : null,
    createdAt: assignment.createdAt.toISOString(),
    allocations: allocations.map(toCampaignAssignmentAllocationDto),
  };
}
