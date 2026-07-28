// ============================================================================
// Shared Campaign ownership gate — pages and API routes must apply the same
// hierarchy checks. Never rely on UI hiding alone.
// ============================================================================

import {
  assertOwnsManagerData,
  isCallerWorkspaceUser,
  type AuthorizationContext,
} from "@/modules/rbac";
import { listCampaignMembers } from "@/modules/campaigns";

/** Minimal Campaign shape required for hierarchy checks. */
export interface CampaignAccessSubject {
  id?: string;
  organizationId: string;
  ownerManagerId: string | null;
  createdByUserId?: string | null;
}

/**
 * Campaign visibility for elevated staff (not Caller membership mode):
 * - Admin / unrestricted → any campaign in the org
 * - Manager → any campaign (org-wide list; analytics stay hierarchy-filtered)
 * - Team Lead → manager book only (membership checked via canAccessCampaignAsStaff)
 */
export function canAccessCampaignRecord(
  authContext: AuthorizationContext,
  campaign: CampaignAccessSubject,
): boolean {
  if (campaign.organizationId !== authContext.organizationId) {
    return false;
  }

  if (isCallerWorkspaceUser(authContext)) {
    // Callers use membership-based dashboard auth — not this helper.
    return false;
  }

  const primaryRole = authContext.hierarchy.primaryRole;
  if (primaryRole === "Manager" || authContext.hierarchy.unrestricted || primaryRole === "Admin") {
    return true;
  }

  return assertOwnsManagerData(authContext.hierarchy, campaign.ownerManagerId);
}

/**
 * Team Lead: manager book + (created the campaign OR a visible hierarchy user is
 * an active member). Matches Campaign Dashboard authorization.
 */
export async function teamLeadHasCampaignMembership(
  authContext: AuthorizationContext,
  campaign: CampaignAccessSubject & { id: string },
): Promise<boolean> {
  if (campaign.createdByUserId === authContext.userId) {
    return true;
  }
  const visible = new Set(authContext.hierarchy.visibleUserIds ?? [authContext.userId]);
  const members = await listCampaignMembers(campaign.id);
  return members.some((member) => member.isActive && visible.has(member.userId));
}

/**
 * Full staff campaign gate including Team Lead membership rules.
 * Use this for detail pages, assign actions, and list filtering.
 */
export async function canAccessCampaignAsStaff(
  authContext: AuthorizationContext,
  campaign: CampaignAccessSubject & { id: string },
): Promise<boolean> {
  if (!canAccessCampaignRecord(authContext, campaign)) {
    return false;
  }
  if (authContext.hierarchy.primaryRole === "Team Lead") {
    return teamLeadHasCampaignMembership(authContext, campaign);
  }
  return true;
}

export function assertCanAccessCampaignRecord(
  authContext: AuthorizationContext,
  campaign: CampaignAccessSubject,
): void {
  if (!canAccessCampaignRecord(authContext, campaign)) {
    throw new CampaignAccessDeniedError();
  }
}

export async function assertCanAccessCampaignAsStaff(
  authContext: AuthorizationContext,
  campaign: CampaignAccessSubject & { id: string },
): Promise<void> {
  if (!(await canAccessCampaignAsStaff(authContext, campaign))) {
    throw new CampaignAccessDeniedError();
  }
}

/**
 * Narrow a campaign list to those the actor may open (Team Lead membership).
 * Admin / Manager lists are returned unchanged.
 */
export async function filterCampaignsForStaffAccess<T extends CampaignAccessSubject & { id: string }>(
  authContext: AuthorizationContext,
  campaigns: T[],
): Promise<T[]> {
  if (authContext.hierarchy.primaryRole !== "Team Lead") {
    return campaigns;
  }
  const kept: T[] = [];
  for (const campaign of campaigns) {
    if (await teamLeadHasCampaignMembership(authContext, campaign)) {
      kept.push(campaign);
    }
  }
  return kept;
}

export class CampaignAccessDeniedError extends Error {
  constructor(message = "Campaign not found or access denied.") {
    super(message);
    this.name = "CampaignAccessDeniedError";
  }
}
