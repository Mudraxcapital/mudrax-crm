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
  removeCampaignMember,
} from "@/modules/campaigns";

export async function removeCampaignMemberAction(
  campaignId: string,
  userId: string,
): Promise<void> {
  const { session } = await requirePermission("campaign.manage");

  try {
    await removeCampaignMember({
      campaignId,
      userId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof CampaignNotFoundError ||
      error instanceof CampaignMembershipNotFoundError
    ) {
      return;
    }
    throw error;
  }

  revalidatePath(`/campaigns/${campaignId}`);
}
