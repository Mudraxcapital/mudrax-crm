// ============================================================================
// Shared Lead ownership gate — pages, API routes, and server actions must
// apply the same hierarchy checks. Never rely on UI hiding alone.
// ============================================================================

import {
  assertOwnsManagerData,
  getPermissionScope,
  type AuthorizationContext,
} from "@/modules/rbac";

/** Minimal Lead shape required for hierarchy / SELF checks. */
export interface LeadAccessSubject {
  organizationId: string;
  ownerManagerId: string | null;
  ownerTeamLeadId: string | null;
  currentAssigneeUserId: string | null;
}

/**
 * Same ownership rules as Lead Detail (`/leads/[id]`):
 * - Organization must match
 * - Manager book (ownerManagerId)
 * - Team Lead ownership when the Lead is owned by a Team Lead
 * - SELF permission scope → only the current assignee
 */
export function canAccessLead(
  authContext: AuthorizationContext,
  lead: LeadAccessSubject,
  options?: {
    /** Permission whose Data Scope drives SELF (default: lead.view). */
    permissionCode?: string;
    /** Acting user id — required when scope is SELF. */
    actorUserId?: string;
  },
): boolean {
  if (lead.organizationId !== authContext.organizationId) {
    return false;
  }

  if (!assertOwnsManagerData(authContext.hierarchy, lead.ownerManagerId)) {
    return false;
  }

  // Team Leads only see leads they own — null ownerTeamLeadId (Admin / Direct
  // Admin book) must not leak through the Manager-book check alone.
  if (authContext.hierarchy.primaryRole === "Team Lead") {
    if (
      !lead.ownerTeamLeadId ||
      lead.ownerTeamLeadId !== authContext.hierarchy.teamLeadId
    ) {
      return false;
    }
  }

  const permissionCode = options?.permissionCode ?? "lead.view";
  const scope = getPermissionScope(authContext, permissionCode);
  const actorUserId = options?.actorUserId ?? authContext.userId;
  if (scope === "SELF" && lead.currentAssigneeUserId !== actorUserId) {
    return false;
  }

  return true;
}

/**
 * Throws when the actor cannot access the Lead.
 * Call after permission checks; treat denial like not-found at the boundary
 * (avoid leaking existence across hierarchy).
 */
export function assertCanAccessLead(
  authContext: AuthorizationContext,
  lead: LeadAccessSubject,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): void {
  if (!canAccessLead(authContext, lead, options)) {
    throw new LeadAccessDeniedError();
  }
}

export class LeadAccessDeniedError extends Error {
  constructor(message = "Lead not found or access denied.") {
    super(message);
    this.name = "LeadAccessDeniedError";
  }
}
