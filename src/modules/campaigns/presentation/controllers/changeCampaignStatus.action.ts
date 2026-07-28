"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/changeCampaignStatus.action.ts
//
// Server Action for moving a Campaign through its status lifecycle.
// Requires `campaign.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  CampaignNotFoundError,
  InvalidCampaignStatusTransitionError,
  changeCampaignStatus,
  changeCampaignStatusSchema,
  getCampaign,
} from "@/modules/campaigns";
import { requirePermission } from "@/infra/auth/session";
import {
  assertCanAccessCampaignRecord,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";
import type { CampaignFormState } from "./createCampaign.action";

export async function changeCampaignStatusAction(
  id: string,
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session, authContext } = await requirePermission("campaign.manage");

  const parsed = changeCampaignStatusSchema.safeParse({ status: formData.get("status") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const existing = await getCampaign(id);
    assertCanAccessCampaignRecord(authContext, existing);
    await changeCampaignStatus({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof CampaignAccessDeniedError) {
      return { error: "Campaign not found or access denied." };
    }
    if (
      error instanceof CampaignNotFoundError ||
      error instanceof InvalidCampaignStatusTransitionError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/campaigns/${id}`);
  revalidatePath(`/campaigns/${id}/dashboard`);
  revalidatePath("/campaigns");
  return {};
}
