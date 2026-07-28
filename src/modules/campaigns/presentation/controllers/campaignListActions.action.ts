"use server";

// ============================================================================
// Campaign list Restart / Archive actions — reuse changeCampaignStatus.
// Requires campaign.manage (Callers never receive these controls).
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  CAMPAIGN_STATUS_TRANSITIONS,
  CampaignNotFoundError,
  InvalidCampaignStatusTransitionError,
  changeCampaignStatus,
  getCampaign,
  type CampaignStatus,
} from "@/modules/campaigns";
import { requirePermission } from "@/infra/auth/session";
import {
  assertCanAccessCampaignRecord,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";

export interface CampaignListActionState {
  error?: string;
  success?: string;
}

async function transitionCampaign(
  id: string,
  preferred: CampaignStatus[],
): Promise<CampaignListActionState> {
  const { session, authContext } = await requirePermission("campaign.manage");

  let campaign;
  try {
    campaign = await getCampaign(id);
    assertCanAccessCampaignRecord(authContext, campaign);
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof CampaignAccessDeniedError) {
      return { error: "You do not have access to this campaign." };
    }
    throw error;
  }

  const allowed = CAMPAIGN_STATUS_TRANSITIONS[campaign.status];
  const next = preferred.find((status) => allowed.includes(status));
  if (!next) {
    return {
      error: `Cannot change status from ${campaign.status} to ${preferred.join(" / ")}.`,
    };
  }

  try {
    await changeCampaignStatus({
      id,
      input: { status: next },
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof CampaignNotFoundError ||
      error instanceof InvalidCampaignStatusTransitionError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  revalidatePath(`/campaigns/${id}/dashboard`);
  return { success: `Campaign is now ${next}.` };
}

export async function restartCampaignAction(
  id: string,
): Promise<CampaignListActionState> {
  return transitionCampaign(id, ["ACTIVE"]);
}

export async function archiveCampaignAction(
  id: string,
): Promise<CampaignListActionState> {
  return transitionCampaign(id, ["ARCHIVED"]);
}
