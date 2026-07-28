"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/removeCampaignMember.action.ts
//
// Server Action to remove a User from a Campaign's active membership.
// Requires `campaign.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  CampaignMembershipNotFoundError,
  CampaignNotFoundError,
  getCampaign,
  removeCampaignMember,
} from "@/modules/campaigns";
import {
  assertCanAccessCampaignRecord,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";

export async function removeCampaignMemberAction(
  campaignId: string,
  userId: string,
): Promise<void> {
  const { session, authContext } = await requirePermission("campaign.manage");

  try {
    const campaign = await getCampaign(campaignId);
    assertCanAccessCampaignRecord(authContext, campaign);
    await removeCampaignMember({
      campaignId,
      userId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof CampaignNotFoundError ||
      error instanceof CampaignMembershipNotFoundError ||
      error instanceof CampaignAccessDeniedError
    ) {
      return;
    }
    throw error;
  }

  revalidatePath(`/campaigns/${campaignId}`);
}
