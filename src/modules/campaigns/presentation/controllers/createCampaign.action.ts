"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/createCampaign.action.ts
//
// Server Action backing the "create Campaign" form. Requires
// `campaign.manage` (Manager+).
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { createCampaign, createCampaignSchema } from "@/modules/campaigns";

export interface CampaignFormState {
  error?: string;
}

export async function createCampaignAction(
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session, authContext } = await requirePermission("campaign.manage");

  const parsed = createCampaignSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const created = await createCampaign({
    organizationId: authContext.organizationId,
    input: parsed.data,
    actor: { actorType: "USER", actorId: session.user.id },
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${created.id}`);
}
