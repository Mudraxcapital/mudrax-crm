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
import type { AllocationMethod } from "../../domain/entities/CampaignAssignment";
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
  /**
   * When set, only these active members participate in allocation
   * (Team Lead hierarchy scope — never assign to agents outside the book).
   */
  restrictToMemberUserIds?: string[];
}

interface PlannedAllocation {
  userId: string;
  allocatedCount: number;
  allocatedPercentage: number | null;
  leadIds: string[];
}

/** Weighted equal split — cumulative-deficit round robin over member weights. */
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

/** Strict sequential round robin: A → B → C → A … */
function planRoundRobinAllocation(
  members: CampaignMembership[],
  leadIds: string[],
): PlannedAllocation[] {
  const plans: PlannedAllocation[] = members.map((member) => ({
    userId: member.userId,
    allocatedCount: 0,
    allocatedPercentage: null,
    leadIds: [],
  }));

  leadIds.forEach((leadId, index) => {
    const plan = plans[index % plans.length]!;
    plan.leadIds.push(leadId);
    plan.allocatedCount += 1;
  });

  return plans.filter((plan) => plan.allocatedCount > 0);
}

/** Random but balanced — shuffle leads, then equal-weight round robin. */
function planRandomAllocation(
  members: CampaignMembership[],
  leadIds: string[],
): PlannedAllocation[] {
  const shuffled = [...leadIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return planRoundRobinAllocation(members, shuffled);
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

  // Largest-remainder method so early buckets cannot consume the whole list.
  const entries = Object.entries(percentages);
  const exact = entries.map(([userId, percentage]) => ({
    userId,
    percentage,
    exactCount: (percentage / 100) * leadIds.length,
  }));
  const floors = exact.map((row) => ({
    ...row,
    floor: Math.floor(row.exactCount),
    fraction: row.exactCount - Math.floor(row.exactCount),
  }));
  let remaining = leadIds.length - floors.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...floors].sort((a, b) => b.fraction - a.fraction || a.userId.localeCompare(b.userId));
  const extra = new Map<string, number>();
  for (const row of ranked) {
    if (remaining <= 0) break;
    extra.set(row.userId, 1);
    remaining -= 1;
  }

  const plans: PlannedAllocation[] = [];
  let cursor = 0;
  for (const row of floors) {
    const count = row.floor + (extra.get(row.userId) ?? 0);
    const slice = leadIds.slice(cursor, cursor + count);
    cursor += slice.length;
    plans.push({
      userId: row.userId,
      allocatedCount: slice.length,
      allocatedPercentage: row.percentage,
      leadIds: slice,
    });
  }

  return plans.filter((plan) => plan.allocatedCount > 0);
}

function planManualAllocation(
  members: CampaignMembership[],
  leadIds: string[],
  assigneeUserId: string,
): PlannedAllocation[] {
  if (!members.some((member) => member.userId === assigneeUserId)) {
    throw new InvalidAllocationError(
      `User ${assigneeUserId} is not an active member of this Campaign.`,
    );
  }
  return [
    {
      userId: assigneeUserId,
      allocatedCount: leadIds.length,
      allocatedPercentage: 100,
      leadIds: [...leadIds],
    },
  ];
}

function planAllocations(
  method: AllocationMethod,
  members: CampaignMembership[],
  leadIds: string[],
  percentages: Record<string, number> | undefined,
  manualAssigneeUserId: string | undefined,
): PlannedAllocation[] {
  switch (method) {
    case "EQUAL":
      return planEqualAllocation(members, leadIds);
    case "ROUND_ROBIN":
      return planRoundRobinAllocation(members, leadIds);
    case "RANDOM":
      return planRandomAllocation(members, leadIds);
    case "PERCENTAGE":
      return planPercentageAllocation(members, leadIds, percentages ?? {});
    case "MANUAL":
      if (!manualAssigneeUserId) {
        throw new InvalidAllocationError("Manual assignment requires an assignee.");
      }
      return planManualAllocation(members, leadIds, manualAssigneeUserId);
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
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
    const restrictTo = command.restrictToMemberUserIds
      ? new Set(command.restrictToMemberUserIds)
      : null;
    const activeMembers = members.filter(
      (member) => member.isActive && (!restrictTo || restrictTo.has(member.userId)),
    );
    if (activeMembers.length === 0) {
      throw new NoActiveMembersError(campaignId);
    }

    if (
      input.allocationMethod === "MANUAL" &&
      input.manualAssigneeUserId &&
      restrictTo &&
      !restrictTo.has(input.manualAssigneeUserId)
    ) {
      throw new InvalidAllocationError("Assignee is outside your hierarchy scope.");
    }

    for (const leadId of input.leadIds) {
      const lead = await leadLookup.findById(leadId);
      if (!lead || lead.organizationId !== campaign.organizationId) {
        throw new InvalidLeadReferenceError(leadId);
      }
    }

    const plans = planAllocations(
      input.allocationMethod,
      activeMembers,
      input.leadIds,
      input.percentages,
      input.manualAssigneeUserId,
    );

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

    // Execute in original Lead order so Round Robin / Random sequences are preserved.
    const assigneeByLeadId = new Map<string, string>();
    for (const plan of plans) {
      for (const leadId of plan.leadIds) {
        assigneeByLeadId.set(leadId, plan.userId);
      }
    }

    let succeeded = 0;
    let failed = 0;
    for (const leadId of input.leadIds) {
      const assignee = assigneeByLeadId.get(leadId);
      if (!assignee) {
        failed += 1;
        continue;
      }
      try {
        await leadLookup.assign(leadId, assignee, actor.actorId, assignment.id);
        succeeded += 1;
      } catch {
        // A single Lead assignment failure does not abort the batch.
        failed += 1;
      }
    }

    // COMPLETED only when every targeted Lead was assigned; otherwise FAILED
    // (partial success still applied individual assigns — surface via FAILED).
    const finalStatus =
      input.leadIds.length > 0 && failed === 0 && succeeded > 0
        ? "COMPLETED"
        : "FAILED";
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
