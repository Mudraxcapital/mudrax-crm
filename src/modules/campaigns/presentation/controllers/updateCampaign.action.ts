"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/updateCampaign.action.ts
//
// Server Action backing the "edit Campaign" form. Requires `campaign.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { CampaignNotFoundError, updateCampaign, updateCampaignSchema } from "@/modules/campaigns";
import type { CampaignFormState } from "./createCampaign.action";

export async function updateCampaignAction(
  id: string,
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session } = await requirePermission("campaign.manage");

  const parsed = updateCampaignSchema.safeParse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || null,
    startDate: formData.get("startDate") || null,
    endDate: formData.get("endDate") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCampaign({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof CampaignNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}
