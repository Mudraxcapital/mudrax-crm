// ============================================================================
// src/modules/campaigns/application/use-cases/redistributeCampaignLeads.ts
//
// When Campaign membership changes, rebalance all uncompleted Leads across
// every active Caller (weighted EQUAL when members have weights ≠ 1).
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import type { AllocationMethod } from "../../domain/entities/CampaignAssignment";
import { CampaignNotFoundError, NoActiveMembersError } from "../../domain/errors/CampaignErrors";
import type { LeadAssignmentPort } from "../ports/LeadAssignmentPort";
import { makeAssignCampaignLeads } from "./assignCampaignLeads";
import type { CampaignAssignmentDto } from "../dto/CampaignAssignmentDto";

export interface RedistributeCampaignLeadsCommand {
  campaignId: string;
  actor: CampaignAuditActor;
  correlationId?: string | null;
  /** Override allocation method; otherwise inferred from Campaign description / EQUAL. */
  allocationMethod?: AllocationMethod;
}

/** Parse preferred distribution strategy from Campaign description metadata lines. */
export function parseCampaignDistributionMethod(
  description: string | null | undefined,
): AllocationMethod {
  if (!description) return "EQUAL";
  const line = description
    .split("\n")
    .map((part) => part.trim())
    .find((part) => /^distribution:\s*/i.test(part));
  if (!line) return "EQUAL";
  const raw = line.replace(/^distribution:\s*/i, "").trim().toUpperCase();
  if (
    raw === "EQUAL" ||
    raw === "ROUND_ROBIN" ||
    raw === "RANDOM" ||
    raw === "PERCENTAGE" ||
    raw === "MANUAL"
  ) {
    // MANUAL / PERCENTAGE need extra inputs — fall back to weighted equal.
    if (raw === "MANUAL" || raw === "PERCENTAGE") return "EQUAL";
    return raw;
  }
  return "EQUAL";
}

function isUncompletedLead(lead: {
  currentStageBucket: "INITIAL" | "ACTIVE" | "CLOSED";
  wonAt: string | null;
  lostAt: string | null;
}): boolean {
  if (lead.wonAt || lead.lostAt) return false;
  return lead.currentStageBucket !== "CLOSED";
}

export function makeRedistributeCampaignLeads(
  repository: CampaignRepository,
  leadLookup: LeadAssignmentPort,
) {
  const assignCampaignLeads = makeAssignCampaignLeads(repository, leadLookup);

  return async function redistributeCampaignLeads(
    command: RedistributeCampaignLeadsCommand,
  ): Promise<CampaignAssignmentDto | null> {
    const { campaignId, actor, correlationId } = command;

    const campaign = await repository.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const members = await repository.listMembers(campaignId);
    const activeMembers = members.filter((member) => member.isActive);
    if (activeMembers.length === 0) {
      throw new NoActiveMembersError(campaignId);
    }

    const leads = await leadLookup.listByCampaign(campaign.organizationId, campaignId);
    const redistributableIds = leads
      .filter(isUncompletedLead)
      .map((lead) => lead.id);

    if (redistributableIds.length === 0) {
      return null;
    }

    const allocationMethod =
      command.allocationMethod ?? parseCampaignDistributionMethod(campaign.description);

    return assignCampaignLeads({
      campaignId,
      input: {
        leadIds: redistributableIds,
        allocationMethod,
      },
      actor,
      correlationId,
    });
  };
}
