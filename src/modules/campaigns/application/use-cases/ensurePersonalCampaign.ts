// ============================================================================
// src/modules/campaigns/application/use-cases/ensurePersonalCampaign.ts
//
// Ensures the org has an ACTIVE "Personal Campaign" for personally assigned
// (single-add) leads, and enrolls the given members so Caller/app surfaces
// can scope to it via membership.
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import type { CampaignStatus } from "../../domain/entities/Campaign";
import { CAMPAIGN_STATUS_TRANSITIONS } from "../../domain/entities/Campaign";
import type { UserLookupPort } from "../ports/UserLookupPort";
import { toCampaignDto, type CampaignDto } from "../dto/CampaignDto";

export const PERSONAL_CAMPAIGN_NAME = "Personal Campaign";

export interface EnsurePersonalCampaignCommand {
  organizationId: string;
  /** Required hierarchical owner (Manager id) when the campaign must be created. */
  ownerManagerId: string;
  actor: CampaignAuditActor;
  /** Users who should see/work personal leads (typically the assignee). */
  memberUserIds?: string[];
  correlationId?: string | null;
}

async function activateCampaign(
  repository: CampaignRepository,
  campaignId: string,
  currentStatus: CampaignStatus,
  actor: CampaignAuditActor,
  correlationId?: string | null,
): Promise<void> {
  if (currentStatus === "ACTIVE") return;

  if (currentStatus === "COMPLETED") {
    if (CAMPAIGN_STATUS_TRANSITIONS.COMPLETED.includes("ARCHIVED")) {
      await repository.changeStatusWithAudit(campaignId, "ARCHIVED", actor, correlationId);
      currentStatus = "ARCHIVED";
    }
  }

  if (CAMPAIGN_STATUS_TRANSITIONS[currentStatus]?.includes("ACTIVE")) {
    await repository.changeStatusWithAudit(campaignId, "ACTIVE", actor, correlationId);
  }
}

export function makeEnsurePersonalCampaign(
  repository: CampaignRepository,
  userLookup: UserLookupPort,
) {
  return async function ensurePersonalCampaign(
    command: EnsurePersonalCampaignCommand,
  ): Promise<CampaignDto> {
    const { organizationId, ownerManagerId, actor, correlationId } = command;
    const memberUserIds = [...new Set((command.memberUserIds ?? []).filter(Boolean))];

    const existing = (await repository.list(organizationId)).find(
      (campaign) => campaign.name.trim().toLowerCase() === PERSONAL_CAMPAIGN_NAME.toLowerCase(),
    );

    let campaign = existing ?? null;
    if (!campaign) {
      campaign = await repository.createWithAudit(
        {
          organizationId,
          name: PERSONAL_CAMPAIGN_NAME,
          description: "Default campaign for personally assigned (single-add) leads.",
          createdByUserId: actor.actorId || ownerManagerId,
          ownerManagerId,
        },
        actor,
        correlationId,
      );
    }

    await activateCampaign(repository, campaign.id, campaign.status, actor, correlationId);
    const refreshed = await repository.findById(campaign.id);
    if (refreshed) campaign = refreshed;

    for (const userId of memberUserIds) {
      const user = await userLookup.findById(userId);
      if (!user || user.organizationId !== organizationId || user.status !== "ACTIVE") {
        continue;
      }
      const membership = await repository.findMembership(campaign.id, userId);
      if (membership?.isActive) continue;
      await repository.addMemberWithAudit(campaign.id, userId, 1, actor, correlationId);
    }

    return toCampaignDto(campaign);
  };
}
