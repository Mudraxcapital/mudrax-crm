// ============================================================================
// src/modules/campaigns/application/use-cases/getCampaignStatistics.ts
//
// Lightweight, self-contained Campaign Statistics — memberships and
// assignment-allocation counts already owned by this module. Campaign
// Analytics (deeper Lead-outcome breakdowns) is owned by `reports`
// (campaigns.md), so this intentionally does not reach into `leads`.
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import { CampaignNotFoundError } from "../../domain/errors/CampaignErrors";

export interface CampaignStatistics {
  campaignId: string;
  memberCount: number;
  activeMemberCount: number;
  assignmentBatchCount: number;
  totalLeadsAllocated: number;
  completedAssignmentBatches: number;
  failedAssignmentBatches: number;
}

export function makeGetCampaignStatistics(repository: CampaignRepository) {
  return async function getCampaignStatistics(campaignId: string): Promise<CampaignStatistics> {
    const campaign = await repository.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const [members, assignments] = await Promise.all([
      repository.listMembers(campaignId),
      repository.listAssignments(campaignId),
    ]);

    return {
      campaignId,
      memberCount: members.length,
      activeMemberCount: members.filter((member) => member.isActive).length,
      assignmentBatchCount: assignments.length,
      totalLeadsAllocated: assignments.reduce(
        (sum, assignment) => sum + assignment.targetLeadCount,
        0,
      ),
      completedAssignmentBatches: assignments.filter(
        (assignment) => assignment.status === "COMPLETED",
      ).length,
      failedAssignmentBatches: assignments.filter((assignment) => assignment.status === "FAILED")
        .length,
    };
  };
}
