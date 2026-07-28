"use server";

// ============================================================================
// src/modules/campaigns/presentation/controllers/assignCampaignLeads.action.ts
//
// Server Action to trigger a Campaign Assignment allocation run. Requires
// `campaign.assign` (Team Leader+).
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import { canViewUserId } from "@/modules/rbac";
import {
  CampaignNotFoundError,
  InvalidAllocationError,
  InvalidLeadReferenceError,
  NoActiveMembersError,
  assignCampaignLeads,
  assignCampaignLeadsSchema,
  getCampaign,
} from "@/modules/campaigns";
import { listLeads } from "@/modules/leads";
import {
  assertCanAccessCampaignAsStaff,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";
import { leadHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";
import type { CampaignFormState } from "./createCampaign.action";

export async function assignCampaignLeadsAction(
  campaignId: string,
  memberUserIds: string[],
  _previousState: CampaignFormState | undefined,
  formData: FormData,
): Promise<CampaignFormState> {
  const { session, authContext } = await requirePermission("campaign.assign");

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
    const campaign = await getCampaign(campaignId);
    await assertCanAccessCampaignAsStaff(authContext, campaign);

    // Team Lead: only redistribute leads + members inside hierarchy scope.
    const hierarchy = authContext.hierarchy;
    const isTeamLead = hierarchy.primaryRole === "Team Lead";
    let scopedLeadIds = parsed.data.leadIds;
    let restrictToMemberUserIds: string[] | undefined;

    if (isTeamLead) {
      const visibleLeads = await listLeads(authContext.organizationId, {
        campaignId,
        ...leadHierarchyFilter(authContext),
        limit: 100_000,
      });
      const allowedLeadIds = new Set(visibleLeads.map((lead) => lead.id));
      scopedLeadIds = parsed.data.leadIds.filter((id) => allowedLeadIds.has(id));
      if (scopedLeadIds.length === 0) {
        return { error: "No leads in your hierarchy scope to assign." };
      }
      restrictToMemberUserIds = (hierarchy.visibleUserIds ?? [authContext.userId]).filter((id) =>
        canViewUserId(hierarchy, id),
      );
      if (
        parsed.data.manualAssigneeUserId &&
        !restrictToMemberUserIds.includes(parsed.data.manualAssigneeUserId)
      ) {
        return { error: "Assignee is outside your hierarchy scope." };
      }
    }

    await assignCampaignLeads({
      campaignId,
      input: { ...parsed.data, leadIds: scopedLeadIds },
      actor: { actorType: "USER", actorId: session.user.id },
      restrictToMemberUserIds,
    });
  } catch (error) {
    if (error instanceof CampaignAccessDeniedError) {
      return { error: "Campaign not found or access denied." };
    }
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
