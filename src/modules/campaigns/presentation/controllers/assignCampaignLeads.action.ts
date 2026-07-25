"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/assignCampaignLeads.action.ts
//
// Server Action to trigger a Campaign Assignment allocation run. Requires
// `campaign.assign` (Team Leader+).
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  CampaignNotFoundError,
  InvalidAllocationError,
  InvalidLeadReferenceError,
  NoActiveMembersError,
  assignCampaignLeads,
  assignCampaignLeadsSchema,
} from "@/modules/campaigns";
import type { CampaignFormState } from "./createCampaign.action";

export async function assignCampaignLeadsAction(
  campaignId: string,
  memberUserIds: string[],
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session } = await requirePermission("campaign.assign");

  const leadIds = formData.getAll("leadIds").map(String);
  const allocationMethod = formData.get("allocationMethod");

  const percentages: Record<string, number> = {};
  if (allocationMethod === "PERCENTAGE") {
    for (const userId of memberUserIds) {
      const raw = formData.get(`percentage_${userId}`);
      if (raw !== null && raw !== "") {
        percentages[userId] = Number(raw);
      }
    }
  }

  const parsed = assignCampaignLeadsSchema.safeParse({
    leadIds,
    allocationMethod,
    percentages: allocationMethod === "PERCENTAGE" ? percentages : undefined,
    manualAssigneeUserId:
      allocationMethod === "MANUAL"
        ? formData.get("manualAssigneeUserId") || undefined
        : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await assignCampaignLeads({
      campaignId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof CampaignNotFoundError ||
      error instanceof NoActiveMembersError ||
      error instanceof InvalidAllocationError ||
      error instanceof InvalidLeadReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/leads");
  return {};
}
