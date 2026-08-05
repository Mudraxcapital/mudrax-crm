// ============================================================================
// src/modules/follow-ups/infrastructure/adapters/UsersModuleLookupAdapter.ts
//
// Adapts `users`' public API (index.ts) to this module's UserLookupPort —
// the only file in `follow-ups` allowed to import from `users` (ADR 0001).
// ============================================================================

import { getUserScopeContext, getUserSummary, listUsersByRole } from "@/modules/users";
import type {
  UserHierarchyLookup,
  UserLookupPort,
  UserLookupSummary,
} from "../../application/ports/UserLookupPort";

export class UsersModuleLookupAdapter implements UserLookupPort {
  async findById(userId: string): Promise<UserLookupSummary | null> {
    const user = await getUserSummary(userId);
    if (!user) return null;
    return { id: user.id, organizationId: user.organizationId, status: user.status };
  }

  async findHierarchy(userId: string): Promise<UserHierarchyLookup | null> {
    const scope = await getUserScopeContext(userId);
    if (!scope) return null;
    return {
      id: scope.userId,
      status: scope.status,
      assignedTeamLeadId: scope.assignedTeamLeadId,
      reportingManagerId: scope.reportingManagerId,
    };
  }

  async listActiveAdminIds(organizationId: string): Promise<string[]> {
    const admins = await listUsersByRole("Admin");
    return admins
      .filter(
        (user) => user.organizationId === organizationId && user.status === "ACTIVE",
      )
      .map((user) => user.id);
  }
}
