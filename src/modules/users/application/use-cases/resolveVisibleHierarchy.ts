// ============================================================================
// src/modules/users/application/use-cases/resolveVisibleHierarchy.ts
//
// Resolves Admin → Manager → Team Lead → Caller visibility sets for the
// logged-in User. Used by RBAC AuthorizationContext.hierarchy.
// ============================================================================

import type { HierarchyPrimaryRole, HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";

export function makeResolveVisibleHierarchy(
  repository: UserRepository,
  roles: RoleAssignmentPort,
) {
  return async function resolveVisibleHierarchy(userId: string): Promise<HierarchyScope> {
    const scope = await repository.findScopeContext(userId);
    const roleName = (await roles.getPrimaryRoleName(userId)) as HierarchyPrimaryRole | null;

    if (!scope || !roleName) {
      return {
        primaryRole: roleName,
        ownerManagerId: null,
        teamLeadId: null,
        visibleUserIds: [userId],
        unrestricted: false,
      };
    }

    if (roleName === "Admin") {
      return {
        primaryRole: "Admin",
        ownerManagerId: null,
        teamLeadId: null,
        visibleUserIds: null,
        unrestricted: true,
      };
    }

    if (roleName === "Manager") {
      // Includes Disabled / Suspended Team Leads and Callers so User Management
      // can still list and re-enable them (assignment pickers filter ACTIVE separately).
      const teamLeadIds = await repository.listTeamLeadIdsForManager(userId);
      const callerIds = await repository.listCallerIdsForTeamLeads(teamLeadIds);
      return {
        primaryRole: "Manager",
        ownerManagerId: userId,
        teamLeadId: null,
        visibleUserIds: [userId, ...teamLeadIds, ...callerIds],
        unrestricted: false,
      };
    }

    if (roleName === "Team Lead") {
      const ownerManagerId = scope.reportingManagerId;
      const callerIds = await repository.listCallerIdsForTeamLeads([userId]);
      return {
        primaryRole: "Team Lead",
        ownerManagerId,
        teamLeadId: userId,
        visibleUserIds: [userId, ...callerIds],
        unrestricted: false,
      };
    }

    // Caller
    const teamLeadId = scope.assignedTeamLeadId;
    let ownerManagerId: string | null = null;
    if (teamLeadId) {
      const lead = await repository.findScopeContext(teamLeadId);
      ownerManagerId = lead?.reportingManagerId ?? null;
    }
    return {
      primaryRole: "Caller",
      ownerManagerId,
      teamLeadId,
      visibleUserIds: [userId],
      unrestricted: false,
    };
  };
}
