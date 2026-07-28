"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/addCampaignMember.action.ts
//
// Server Action to add a User as a Campaign member. Requires
// `campaign.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  CampaignNotFoundError,
  InvalidMemberReferenceError,
  addCampaignMember,
  addCampaignMemberSchema,
  getCampaign,
} from "@/modules/campaigns";
import { requirePermission } from "@/infra/auth/session";
import {
  assertCanAccessCampaignRecord,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";
import type { CampaignFormState } from "./createCampaign.action";

export async function addCampaignMemberAction(
  campaignId: string,
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session, authContext } = await requirePermission("campaign.manage");

  const parsed = addCampaignMemberSchema.safeParse({
    userId: formData.get("userId"),
    allocationWeight: formData.get("allocationWeight") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const campaign = await getCampaign(campaignId);
    assertCanAccessCampaignRecord(authContext, campaign);
    await addCampaignMember({
      campaignId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof CampaignAccessDeniedError) {
      return { error: "Campaign not found or access denied." };
    }
    if (error instanceof CampaignNotFoundError || error instanceof InvalidMemberReferenceError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}
