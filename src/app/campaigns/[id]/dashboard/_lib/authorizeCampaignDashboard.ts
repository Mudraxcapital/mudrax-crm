// ============================================================================
// Campaign Dashboard access — reuses campaign.view + hierarchy, or Caller
// membership (no new permissions).
//
// Role rules (product, without redesigning RBAC codes):
// - Admin: any campaign (unrestricted hierarchy).
// - Manager: any campaign in the org; analytics/leads still hierarchy-filtered
//   inside loadCampaignDashboard.
// - Team Lead: campaign only if they created it, are a member, or at least one
//   visible caller (hierarchy) is a member — still within their manager book.
// - Caller: active membership only (self mode).
// ============================================================================

import {
  assertOwnsManagerData,
  hasPermission,
  isCallerWorkspaceUser,
  type AuthorizationContext,
} from "@/modules/rbac";
import {
  CampaignNotFoundError,
  getCampaign,
  listCampaignsForMember,
  type CampaignDto,
} from "@/modules/campaigns";
import { teamLeadHasCampaignMembership } from "@/shared/auth/assertCanAccessCampaign";

export type CampaignDashboardAccessMode = "full" | "self";

export interface CampaignDashboardAccess {
  campaign: CampaignDto;
  mode: CampaignDashboardAccessMode;
}

export async function authorizeCampaignDashboard(input: {
  authContext: AuthorizationContext;
  campaignId: string;
}): Promise<CampaignDashboardAccess | null> {
  const { authContext, campaignId } = input;

  let campaign: CampaignDto;
  try {
    campaign = await getCampaign(campaignId);
  } catch (error) {
    if (error instanceof CampaignNotFoundError) return null;
    throw error;
  }

  // Tenant isolation — never leak campaign name/metadata across organizations.
  if (campaign.organizationId !== authContext.organizationId) {
    return null;
  }

  const canViewCampaigns = hasPermission(authContext, "campaign.view");
  const callerOnly = isCallerWorkspaceUser(authContext);
  const primaryRole = authContext.hierarchy.primaryRole;

  // Admin / Manager with campaign.view — Managers may open any campaign;
  // hierarchy filters apply to leads/calls/analytics inside the loader.
  if (canViewCampaigns && !callerOnly && primaryRole !== "Team Lead") {
    if (primaryRole === "Manager") {
      return { campaign, mode: "full" };
    }
    if (!assertOwnsManagerData(authContext.hierarchy, campaign.ownerManagerId)) {
      return null;
    }
    return { campaign, mode: "full" };
  }

  // Team Lead with campaign.view — manager book + (created | self/caller member).
  if (canViewCampaigns && primaryRole === "Team Lead") {
    if (!assertOwnsManagerData(authContext.hierarchy, campaign.ownerManagerId)) {
      return null;
    }
    if (await teamLeadHasCampaignMembership(authContext, campaign)) {
      return { campaign, mode: "full" };
    }
    return null;
  }

  // Caller (or membership-only) — campaign must be one they belong to.
  const memberships = await listCampaignsForMember(authContext.userId);
  if (!memberships.some((item) => item.id === campaignId)) {
    return null;
  }
  return { campaign, mode: "self" };
}
