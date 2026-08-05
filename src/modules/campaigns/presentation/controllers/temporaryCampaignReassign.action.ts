"use server";

// ============================================================================
// Temporary holiday/cover reassignment for campaign callers.
// Restricted to Admin and Manager (not Team Lead).
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  CampaignNotFoundError,
  InvalidAllocationError,
  InvalidMemberReferenceError,
  NoActiveMembersError,
  endTemporaryCampaignReassignment,
  endTemporaryCampaignReassignSchema,
  getCampaign,
  temporaryCampaignReassignSchema,
  temporarilyReassignCampaignLeads,
} from "@/modules/campaigns";
import {
  assertCanAccessCampaignAsStaff,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";
import type { CampaignFormState } from "./createCampaign.action";

function assertAdminOrManager(primaryRole: string | null | undefined): string | null {
  if (primaryRole === "Admin" || primaryRole === "Manager") return null;
  return "Only Admins and Managers can set temporary callers.";
}

export async function temporaryCampaignReassignAction(
  campaignId: string,
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session, authContext } = await requirePermission("campaign.assign");
  const roleError = assertAdminOrManager(authContext.hierarchy.primaryRole);
  if (roleError) return { error: roleError };

  const parsed = temporaryCampaignReassignSchema.safeParse({
    fromUserId: formData.get("fromUserId"),
    toUserId: formData.get("toUserId"),
    durationDays: formData.get("durationDays"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const campaign = await getCampaign(campaignId);
    await assertCanAccessCampaignAsStaff(authContext, campaign);

    const result = await temporarilyReassignCampaignLeads({
      campaignId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });

    if (result.movedCount === 0) {
      return {
        error:
          result.failed[0]?.error ??
          "Could not temporarily reassign any leads for that caller.",
      };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/leads");
    return {
      success: `Temporarily reassigned ${result.movedCount} lead(s) until ${new Date(result.temporaryUntil).toLocaleDateString()}.`,
    };
  } catch (error) {
    if (error instanceof CampaignAccessDeniedError) {
      return { error: "Campaign not found or access denied." };
    }
    if (
      error instanceof CampaignNotFoundError ||
      error instanceof NoActiveMembersError ||
      error instanceof InvalidAllocationError ||
      error instanceof InvalidMemberReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function endTemporaryCampaignReassignAction(
  campaignId: string,
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session, authContext } = await requirePermission("campaign.assign");
  const roleError = assertAdminOrManager(authContext.hierarchy.primaryRole);
  if (roleError) return { error: roleError };

  const parsed = endTemporaryCampaignReassignSchema.safeParse({
    fromUserId: formData.get("fromUserId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const campaign = await getCampaign(campaignId);
    await assertCanAccessCampaignAsStaff(authContext, campaign);

    const result = await endTemporaryCampaignReassignment({
      campaignId,
      fromUserId: parsed.data.fromUserId,
      actor: { actorType: "USER", actorId: session.user.id },
    });

    if (result.revertedCount === 0) {
      return {
        error:
          result.failed[0]?.error ??
          "No active temporary assignments found for that caller.",
      };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/leads");
    return {
      success: `Ended temporary cover for ${result.revertedCount} lead(s).`,
    };
  } catch (error) {
    if (error instanceof CampaignAccessDeniedError) {
      return { error: "Campaign not found or access denied." };
    }
    if (error instanceof CampaignNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}
