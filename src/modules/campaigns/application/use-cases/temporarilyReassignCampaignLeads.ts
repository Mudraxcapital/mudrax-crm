// ============================================================================
// src/modules/campaigns/application/use-cases/temporarilyReassignCampaignLeads.ts
//
// Admin/Manager holiday coverage: temporarily move a caller's campaign leads
// to any active agent in the Organization for N days. The temp agent is
// enrolled as a campaign member if needed. Lead writes go through `leads`
// via LeadAssignmentPort (ADR 0004).
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import {
  CampaignNotFoundError,
  InvalidAllocationError,
  InvalidMemberReferenceError,
} from "../../domain/errors/CampaignErrors";
import type { LeadAssignmentPort } from "../ports/LeadAssignmentPort";
import type { UserLookupPort } from "../ports/UserLookupPort";
import type { TemporaryCampaignReassignInput } from "../validators/campaignSchemas";

export interface TemporarilyReassignCampaignLeadsCommand {
  campaignId: string;
  input: TemporaryCampaignReassignInput;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

export interface TemporarilyReassignCampaignLeadsResult {
  movedCount: number;
  failed: Array<{ leadId: string; error: string }>;
  temporaryUntil: string;
}

export function makeTemporarilyReassignCampaignLeads(
  repository: CampaignRepository,
  leads: LeadAssignmentPort,
  userLookup: UserLookupPort,
) {
  return async function temporarilyReassignCampaignLeads(
    command: TemporarilyReassignCampaignLeadsCommand,
  ): Promise<TemporarilyReassignCampaignLeadsResult> {
    const { campaignId, input, actor, correlationId } = command;

    const campaign = await repository.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const fromUser = await userLookup.findById(input.fromUserId);
    if (
      !fromUser ||
      fromUser.organizationId !== campaign.organizationId ||
      fromUser.status !== "ACTIVE"
    ) {
      throw new InvalidMemberReferenceError(input.fromUserId);
    }

    const toUser = await userLookup.findById(input.toUserId);
    if (
      !toUser ||
      toUser.organizationId !== campaign.organizationId ||
      toUser.status !== "ACTIVE"
    ) {
      throw new InvalidMemberReferenceError(input.toUserId);
    }

    // Ensure the temporary cover agent can work this campaign.
    const existingMembership = await repository.findMembership(campaignId, input.toUserId);
    if (!existingMembership?.isActive) {
      await repository.addMemberWithAudit(
        campaignId,
        input.toUserId,
        1,
        actor,
        correlationId,
      );
    }

    const campaignLeads = await leads.listByCampaign(campaign.organizationId, campaignId);
    const toMove = campaignLeads.filter((lead) => {
      if (lead.currentStageBucket === "CLOSED") return false;
      // Move leads currently on the on-leave caller, or already temp-covered for them.
      return (
        lead.currentAssigneeUserId === input.fromUserId ||
        lead.permanentAssigneeUserId === input.fromUserId
      );
    });

    if (toMove.length === 0) {
      throw new InvalidAllocationError(
        "No open leads assigned to that caller in this campaign.",
      );
    }

    const until = new Date();
    until.setUTCDate(until.getUTCDate() + input.durationDays);

    let movedCount = 0;
    const failed: Array<{ leadId: string; error: string }> = [];
    const actorId = actor.actorType === "USER" ? actor.actorId : null;

    for (const lead of toMove) {
      try {
        await leads.temporarilyAssign(
          lead.id,
          input.toUserId,
          input.durationDays,
          actorId,
        );
        movedCount += 1;
      } catch (error) {
        failed.push({
          leadId: lead.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      movedCount,
      failed,
      temporaryUntil: until.toISOString(),
    };
  };
}

export interface EndTemporaryCampaignReassignmentCommand {
  campaignId: string;
  fromUserId: string;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

export interface EndTemporaryCampaignReassignmentResult {
  revertedCount: number;
  failed: Array<{ leadId: string; error: string }>;
}

export function makeEndTemporaryCampaignReassignment(
  repository: CampaignRepository,
  leads: LeadAssignmentPort,
) {
  return async function endTemporaryCampaignReassignment(
    command: EndTemporaryCampaignReassignmentCommand,
  ): Promise<EndTemporaryCampaignReassignmentResult> {
    const { campaignId, fromUserId, actor, correlationId } = command;

    const campaign = await repository.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const campaignLeads = await leads.listByCampaign(campaign.organizationId, campaignId);
    const toRevert = campaignLeads.filter(
      (lead) =>
        lead.permanentAssigneeUserId === fromUserId &&
        lead.temporaryAssigneeUntil != null,
    );

    let revertedCount = 0;
    const failed: Array<{ leadId: string; error: string }> = [];
    const actorId = actor.actorType === "USER" ? actor.actorId : null;

    for (const lead of toRevert) {
      try {
        await leads.revertTemporary(lead.id, actorId);
        revertedCount += 1;
      } catch (error) {
        failed.push({
          leadId: lead.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    void correlationId;

    return { revertedCount, failed };
  };
}
