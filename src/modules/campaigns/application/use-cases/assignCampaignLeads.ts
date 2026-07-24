// ============================================================================
// src/modules/campaigns/application/use-cases/assignCampaignLeads.ts
//
// Distributes a batch of Leads among a Campaign's active members
// (campaigns.md — "a decision, not a write"). This use-case records the
// allocation decision, then initiates each per-Lead assignment through
// `leads`' own public API (via LeadAssignmentPort) — it never writes Lead
// state directly.
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import type { CampaignMembership } from "../../domain/entities/CampaignMembership";
import {
  CampaignNotFoundError,
  InvalidAllocationError,
  InvalidLeadReferenceError,
  NoActiveMembersError,
} from "../../domain/errors/CampaignErrors";
import type { LeadAssignmentPort } from "../ports/LeadAssignmentPort";
import type { AssignCampaignLeadsInput } from "../validators/campaignSchemas";
import { toCampaignAssignmentDto, type CampaignAssignmentDto } from "../dto/CampaignAssignmentDto";

export interface AssignCampaignLeadsCommand {
  campaignId: string;
  input: AssignCampaignLeadsInput;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

interface PlannedAllocation {
  userId: string;
  allocatedCount: number;
  allocatedPercentage: number | null;
  leadIds: string[];
}

/** Round-robin by descending share, so weights/percentages are respected without leaving any Lead unassigned. */
function planEqualAllocation(
  members: CampaignMembership[],
  leadIds: string[],
): PlannedAllocation[] {
  const totalWeight = members.reduce((sum, member) => sum + member.allocationWeight, 0);
  const plans: PlannedAllocation[] = members.map((member) => ({
    userId: member.userId,
    allocatedCount: 0,
    allocatedPercentage: null,
    leadIds: [],
  }));

  leadIds.forEach((leadId, index) => {
    // Weighted round-robin: pick the member whose cumulative share is furthest behind its target.
    let bestIndex = 0;
    let bestDeficit = -Infinity;
    plans.forEach((plan, planIndex) => {
      const targetShare = members[planIndex]!.allocationWeight / totalWeight;
      const deficit = targetShare * (index + 1) - plan.allocatedCount;
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestIndex = planIndex;
      }
    });
    plans[bestIndex]!.leadIds.push(leadId);
    plans[bestIndex]!.allocatedCount += 1;
  });

  return plans.filter((plan) => plan.allocatedCount > 0);
}

function planPercentageAllocation(
  members: CampaignMembership[],
  leadIds: string[],
  percentages: Record<string, number>,
): PlannedAllocation[] {
  const memberIds = new Set(members.map((member) => member.userId));
  const total = Object.values(percentages).reduce((sum, value) => sum + value, 0);
  if (Math.round(total) !== 100) {
    throw new InvalidAllocationError(`Allocation percentages must sum to 100 (got ${total}).`);
  }
  for (const userId of Object.keys(percentages)) {
    if (!memberIds.has(userId)) {
      throw new InvalidAllocationError(`User ${userId} is not an active member of this Campaign.`);
    }
  }

  const plans: PlannedAllocation[] = [];
  let cursor = 0;
  const entries = Object.entries(percentages);
  entries.forEach(([userId, percentage], entryIndex) => {
    const isLast = entryIndex === entries.length - 1;
    const count = isLast
      ? leadIds.length - cursor
      : Math.round((percentage / 100) * leadIds.length);
    const slice = leadIds.slice(cursor, cursor + count);
    cursor += slice.length;
    plans.push({
      userId,
      allocatedCount: slice.length,
      allocatedPercentage: percentage,
      leadIds: slice,
    });
  });

  return plans.filter((plan) => plan.allocatedCount > 0);
}

export function makeAssignCampaignLeads(
  repository: CampaignRepository,
  leadLookup: LeadAssignmentPort,
) {
  return async function assignCampaignLeads(
    command: AssignCampaignLeadsCommand,
  ): Promise<CampaignAssignmentDto> {
    const { campaignId, input, actor, correlationId } = command;

    const campaign = await repository.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const members = await repository.listMembers(campaignId);
    const activeMembers = members.filter((member) => member.isActive);
    if (activeMembers.length === 0) {
      throw new NoActiveMembersError(campaignId);
    }

    for (const leadId of input.leadIds) {
      const lead = await leadLookup.findById(leadId);
      if (!lead || lead.organizationId !== campaign.organizationId) {
        throw new InvalidLeadReferenceError(leadId);
      }
    }

    const plans =
      input.allocationMethod === "EQUAL"
        ? planEqualAllocation(activeMembers, input.leadIds)
        : planPercentageAllocation(activeMembers, input.leadIds, input.percentages ?? {});

    const assignment = await repository.createAssignmentWithAudit(
      {
        campaignId,
        initiatedByUserId: actor.actorId ?? "",
        allocationMethod: input.allocationMethod,
        targetLeadCount: input.leadIds.length,
        allocations: plans.map((plan) => ({
          userId: plan.userId,
          allocatedCount: plan.allocatedCount,
          allocatedPercentage: plan.allocatedPercentage,
        })),
      },
      actor,
      correlationId,
    );

    let allFailed = true;
    for (const plan of plans) {
      for (const leadId of plan.leadIds) {
        try {
          await leadLookup.assign(leadId, plan.userId, actor.actorId, assignment.id);
          allFailed = false;
        } catch {
          // A single Lead assignment failure does not abort the batch; the overall
          // outcome is still recorded so operators can see partial completion.
        }
      }
    }

    const finalStatus = allFailed && input.leadIds.length > 0 ? "FAILED" : "COMPLETED";
    const executed = await repository.markAssignmentExecutedWithAudit(
      assignment.id,
      finalStatus,
      actor,
      correlationId,
    );

    const allocations = await repository.listAssignmentAllocations(executed.id);
    return toCampaignAssignmentDto(executed, allocations);
  };
}
