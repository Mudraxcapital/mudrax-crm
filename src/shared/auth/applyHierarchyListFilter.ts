// ============================================================================
// Shared presentation helper — merges HierarchyScope into module list filters.
// ============================================================================

import {
  getPermissionScope,
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

/**
 * Hierarchy + permission Data Scope for Lead list / export / import / pipeline.
 * Matches All Leads page visibility (Admin/Manager/Team Lead books; SELF → assignee).
 */
export function visibleLeadsFilter(
  authContext: AuthorizationContext,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
    /** Optional assignee filter from the UI (ignored when scope is SELF). */
    assignedToUserId?: string;
  },
): OwnershipQueryFilter {
  const permissionCode = options?.permissionCode ?? "lead.view";
  const scope = getPermissionScope(authContext, permissionCode);
  const hierarchyFilter = leadHierarchyFilter(authContext);
  const actorUserId = options?.actorUserId ?? authContext.userId;

  if (scope === "SELF" || hierarchyFilter.assignedToUserIds) {
    return {
      ...hierarchyFilter,
      assignedToUserIds: hierarchyFilter.assignedToUserIds ?? [actorUserId],
    };
  }

  if (options?.assignedToUserId) {
    return {
      ...hierarchyFilter,
      assignedToUserIds: [options.assignedToUserId],
    };
  }

  return hierarchyFilter;
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

/**
 * Follow-up list filter — single source of truth for `/follow-ups`, Calendar,
 * and `/api/follow-ups`. Follow-ups have no ownerManagerId column; visibility
 * is enforced via current assignee against hierarchy + permission Data Scope.
 */
export function followUpListFilter(
  authContext: AuthorizationContext,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): { assignedToUserIds?: string[] } {
  const permissionCode = options?.permissionCode ?? "follow_up.view";
  const scope = getPermissionScope(authContext, permissionCode);
  const actorUserId = options?.actorUserId ?? authContext.userId;
  const hierarchy = authContext.hierarchy;

  if (scope === "SELF" || hierarchy.primaryRole === "Caller") {
    return { assignedToUserIds: [actorUserId] };
  }

  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") {
    return {};
  }

  if (hierarchy.visibleUserIds?.length) {
    return { assignedToUserIds: hierarchy.visibleUserIds };
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
