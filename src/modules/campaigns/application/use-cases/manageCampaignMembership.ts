// ============================================================================
// src/modules/campaigns/application/use-cases/manageCampaignMembership.ts
//
// Add/remove a User as a Campaign member (campaigns.md — "references Users;
// it does not create Caller identities").
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import {
  CampaignMembershipNotFoundError,
  CampaignNotFoundError,
  InvalidMemberReferenceError,
} from "../../domain/errors/CampaignErrors";
import type { UserLookupPort } from "../ports/UserLookupPort";
import type { AddCampaignMemberInput } from "../validators/campaignSchemas";
import { toCampaignMembershipDto, type CampaignMembershipDto } from "../dto/CampaignMembershipDto";

export interface AddCampaignMemberCommand {
  campaignId: string;
  input: AddCampaignMemberInput;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

export function makeAddCampaignMember(repository: CampaignRepository, userLookup: UserLookupPort) {
  return async function addCampaignMember(
    command: AddCampaignMemberCommand,
  ): Promise<CampaignMembershipDto> {
    const { campaignId, input, actor, correlationId } = command;

    const campaign = await repository.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const user = await userLookup.findById(input.userId);
    if (!user || user.organizationId !== campaign.organizationId || user.status !== "ACTIVE") {
      throw new InvalidMemberReferenceError(input.userId);
    }

    const membership = await repository.addMemberWithAudit(
      campaignId,
      input.userId,
      input.allocationWeight ?? 1,
      actor,
      correlationId,
    );

    return toCampaignMembershipDto(membership);
  };
}

export interface RemoveCampaignMemberCommand {
  campaignId: string;
  userId: string;
  actor: CampaignAuditActor;
  correlationId?: string | null;
}

export function makeRemoveCampaignMember(repository: CampaignRepository) {
  return async function removeCampaignMember(
    command: RemoveCampaignMemberCommand,
  ): Promise<CampaignMembershipDto> {
    const { campaignId, userId, actor, correlationId } = command;

    const campaign = await repository.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const existing = await repository.findMembership(campaignId, userId);
    if (!existing) {
      throw new CampaignMembershipNotFoundError(campaignId, userId);
    }

    const membership = await repository.removeMemberWithAudit(
      campaignId,
      userId,
      actor,
      correlationId,
    );
    return toCampaignMembershipDto(membership);
  };
}

export function makeListCampaignMembers(repository: CampaignRepository) {
  return async function listCampaignMembers(campaignId: string): Promise<CampaignMembershipDto[]> {
    const members = await repository.listMembers(campaignId);
    return members.map(toCampaignMembershipDto);
  };
}
