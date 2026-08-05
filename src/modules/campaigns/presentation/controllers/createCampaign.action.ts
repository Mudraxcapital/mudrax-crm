"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/createCampaign.action.ts
//
// Server Action backing the "create Campaign" form. Requires
// `campaign.manage` (Manager+). Optionally enrolls selected agents as
// members for later auto-distribution.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { requireOwnerManagerId } from "@/modules/rbac";
import {
  addCampaignMember,
  createCampaign,
  createCampaignSchema,
} from "@/modules/campaigns";

export interface CampaignFormState {
  error?: string;
  success?: string;
}

export async function createCampaignAction(
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session, authContext } = await requirePermission("campaign.manage");

  const memberUserIds = formData.getAll("memberUserIds").map(String).filter(Boolean);
  const source = String(formData.get("source") ?? "").trim();
  const priority = String(formData.get("priority") ?? "").trim();
  const baseDescription = String(formData.get("description") ?? "").trim();
  const distributionStrategy = String(formData.get("distributionStrategy") || "").trim();
  const descriptionParts = [
    baseDescription || null,
    source ? `Source: ${source}` : null,
    priority ? `Priority: ${priority}` : null,
    distributionStrategy ? `Distribution: ${distributionStrategy}` : null,
  ].filter(Boolean);

  const parsed = createCampaignSchema.safeParse({
    name: formData.get("name"),
    description: descriptionParts.length > 0 ? descriptionParts.join("\n") : undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    memberUserIds: memberUserIds.length > 0 ? memberUserIds : undefined,
    distributionStrategy: distributionStrategy || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const actor = { actorType: "USER" as const, actorId: session.user.id };
  let ownerManagerId: string;
  try {
    ownerManagerId = requireOwnerManagerId(
      authContext,
      String(formData.get("ownerManagerId") || "") || null,
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Manager ownership is required." };
  }

  const created = await createCampaign({
    organizationId: authContext.organizationId,
    input: parsed.data,
    actor,
    ownerManagerId,
  });

  for (const userId of parsed.data.memberUserIds ?? []) {
    try {
      await addCampaignMember({
        campaignId: created.id,
        input: { userId },
        actor,
        redistribute: false,
      });
    } catch {
      // Skip invalid member candidates; Campaign itself was created successfully.
    }
  }

  revalidatePath("/campaigns");
  const strategy = parsed.data.distributionStrategy;
  const suffix =
    strategy && strategy !== "MANUAL" ? `?distribute=${encodeURIComponent(strategy)}` : "";
  redirect(`/campaigns/${created.id}${suffix}`);
}
