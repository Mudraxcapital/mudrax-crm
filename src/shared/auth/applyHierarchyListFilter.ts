// ============================================================================
// Shared presentation helper — merges HierarchyScope into module list filters.
// ============================================================================

import {
  ownershipFilterFromHierarchy,
  type AuthorizationContext,
  type OwnershipQueryFilter,
} from "@/modules/rbac";

/** Campaign / customer list filter (manager book only). */
export function managerBookFilter(authContext: AuthorizationContext): { ownerManagerId?: string } {
  const ownership = ownershipFilterFromHierarchy(authContext.hierarchy, { forAssignees: false });
  return ownership.ownerManagerId ? { ownerManagerId: ownership.ownerManagerId } : {};
}

/** Lead list filter — manager book + team lead + assignee SELF as needed. */
export function leadHierarchyFilter(authContext: AuthorizationContext): OwnershipQueryFilter {
  const hierarchy = authContext.hierarchy;
  if (hierarchy.primaryRole === "Caller") {
    return ownershipFilterFromHierarchy(hierarchy);
  }
  if (hierarchy.primaryRole === "Team Lead") {
    // Team Lead sees leads they own (ownerTeamLeadId) under their Manager book.
    return {
      ownerManagerId: hierarchy.ownerManagerId ?? undefined,
      ownerTeamLeadId: hierarchy.teamLeadId ?? undefined,
    };
  }
  return ownershipFilterFromHierarchy(hierarchy, { forAssignees: false });
}

/** Call / agent filter. */
export function agentHierarchyFilter(authContext: AuthorizationContext): {
  agentUserId?: string;
  agentUserIds?: string[];
} {
  const ownership = ownershipFilterFromHierarchy(authContext.hierarchy);
  if (authContext.hierarchy.primaryRole === "Caller") {
    return { agentUserId: authContext.userId };
  }
  if (ownership.agentUserIds?.length) {
    return { agentUserIds: ownership.agentUserIds };
  }
  return {};
}

/** Report / analytics filter fragment from hierarchy. */
export function reportHierarchyFilter(authContext: AuthorizationContext): {
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  agentUserIds?: string[] | null;
} {
  const ownership = ownershipFilterFromHierarchy(authContext.hierarchy, { forAssignees: false });
  if (authContext.hierarchy.unrestricted) {
    return {};
  }
  return {
    ownerManagerId: ownership.ownerManagerId ?? null,
    ownerTeamLeadId:
      authContext.hierarchy.primaryRole === "Team Lead"
        ? (authContext.hierarchy.teamLeadId ?? null)
        : null,
    agentUserIds: authContext.hierarchy.visibleUserIds,
  };
}
