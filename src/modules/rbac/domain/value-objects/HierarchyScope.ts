// ============================================================================
// src/modules/rbac/domain/value-objects/HierarchyScope.ts
//
// Single-company hierarchical ownership: Admin → Manager → Team Lead → Caller.
// Every business row is scoped by ownerManagerId; Team Lead / Caller filters
// further narrow visibility. Repositories apply these filters — never the UI alone.
// ============================================================================

export type HierarchyPrimaryRole = "Admin" | "Manager" | "Team Lead" | "Caller";

export interface HierarchyScope {
  primaryRole: HierarchyPrimaryRole | null;
  /**
   * Manager that owns this user's data universe.
   * - Admin: null (unrestricted)
   * - Manager: self
   * - Team Lead / Caller: resolved Manager id
   */
  ownerManagerId: string | null;
  /**
   * Team Lead node for this user.
   * - Team Lead: self
   * - Caller: assigned Team Lead
   * - Manager / Admin: null
   */
  teamLeadId: string | null;
  /**
   * User ids visible in User Management / assignee pickers.
   * null = unrestricted (Admin). Always includes self.
   */
  visibleUserIds: string[] | null;
  /** True when queries must not apply ownerManagerId (Admin). */
  unrestricted: boolean;
}

/** Prisma / repository filter fragment for manager-owned aggregates. */
export interface OwnershipQueryFilter {
  /** When set, restrict to this ownerManagerId. Omit when unrestricted (Admin). */
  ownerManagerId?: string;
  /** When set, restrict leads (etc.) to this Team Lead ownership column. */
  ownerTeamLeadId?: string;
  /** When set, restrict to these assignee / agent user ids. */
  assignedToUserIds?: string[];
  /** When set, restrict call agents to these user ids. */
  agentUserIds?: string[];
}

/**
 * Build a reusable ownership filter for list/count queries.
 * Callers stay SELF-scoped; Team Leads see their Manager's book narrowed to
 * their callers where assignee filters apply; Managers see their book.
 */
export function ownershipFilterFromHierarchy(
  hierarchy: HierarchyScope,
  options?: { forAssignees?: boolean },
): OwnershipQueryFilter {
  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") {
    return {};
  }

  if (hierarchy.primaryRole === "Caller") {
    return {
      ownerManagerId: hierarchy.ownerManagerId ?? undefined,
      assignedToUserIds: hierarchy.visibleUserIds ?? undefined,
      agentUserIds: hierarchy.visibleUserIds ?? undefined,
    };
  }

  if (hierarchy.primaryRole === "Team Lead") {
    const filter: OwnershipQueryFilter = {
      ownerManagerId: hierarchy.ownerManagerId ?? undefined,
      ownerTeamLeadId: hierarchy.teamLeadId ?? undefined,
    };
    if (options?.forAssignees !== false) {
      filter.assignedToUserIds = hierarchy.visibleUserIds ?? undefined;
      filter.agentUserIds = hierarchy.visibleUserIds ?? undefined;
    }
    return filter;
  }

  // Manager
  return {
    ownerManagerId: hierarchy.ownerManagerId ?? undefined,
  };
}

export function assertOwnsManagerData(
  hierarchy: HierarchyScope,
  ownerManagerId: string | null | undefined,
): boolean {
  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") return true;

  // Direct Admin Callers (no Team Lead / Manager book) own the org-scoped null book.
  if (hierarchy.primaryRole === "Caller" && !hierarchy.ownerManagerId) {
    return ownerManagerId == null;
  }

  if (!hierarchy.ownerManagerId) return false;
  return ownerManagerId === hierarchy.ownerManagerId;
}

export function canViewUserId(hierarchy: HierarchyScope, targetUserId: string): boolean {
  if (hierarchy.unrestricted || hierarchy.primaryRole === "Admin") return true;
  if (!hierarchy.visibleUserIds) return false;
  return hierarchy.visibleUserIds.includes(targetUserId);
}
