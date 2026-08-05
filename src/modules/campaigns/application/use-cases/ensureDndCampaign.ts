// ============================================================================
// src/modules/campaigns/application/use-cases/ensureDndCampaign.ts
//
// Ensures the org has an ACTIVE "Do Not Disturb" campaign that stores every
// lead marked with the Do Not Disturb Active stage.
// ============================================================================

import type { CampaignRepository } from "../../domain/repositories/CampaignRepository";
import type { CampaignAuditActor } from "../../domain/entities/CampaignAuditRecord";
import type { CampaignStatus } from "../../domain/entities/Campaign";
import { CAMPAIGN_STATUS_TRANSITIONS } from "../../domain/entities/Campaign";
import type { UserLookupPort } from "../ports/UserLookupPort";
import { toCampaignDto, type CampaignDto } from "../dto/CampaignDto";

export const DND_CAMPAIGN_NAME = "Do Not Disturb";

/** True when the campaign name is the system Do Not Disturb holding campaign. */
export function isDoNotDisturbCampaignName(name: string): boolean {
  return name.trim().toLowerCase() === DND_CAMPAIGN_NAME.toLowerCase();
}

export interface EnsureDndCampaignCommand {
  organizationId: string;
  /** Required hierarchical owner (Manager id) when the campaign must be created. */
  ownerManagerId: string;
  actor: CampaignAuditActor;
  /** Optional members who should see the DND campaign (e.g. Managers). */
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

export function makeEnsureDndCampaign(
  repository: CampaignRepository,
  userLookup: UserLookupPort,
) {
  return async function ensureDndCampaign(
    command: EnsureDndCampaignCommand,
  ): Promise<CampaignDto> {
    const { organizationId, ownerManagerId, actor, correlationId } = command;
    const memberUserIds = [...new Set((command.memberUserIds ?? []).filter(Boolean))];

    const existing = (await repository.list(organizationId)).find(
      (campaign) => campaign.name.trim().toLowerCase() === DND_CAMPAIGN_NAME.toLowerCase(),
    );

    let campaign = existing ?? null;
    if (!campaign) {
      campaign = await repository.createWithAudit(
        {
          organizationId,
          name: DND_CAMPAIGN_NAME,
          description:
            "System campaign for leads marked Do Not Disturb. Import skips contacts already here.",
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
