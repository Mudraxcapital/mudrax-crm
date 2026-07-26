// ============================================================================
// src/modules/leads/infrastructure/adapters/UsersModuleLookupAdapter.ts
//
// Adapts `users`' public API (index.ts) to this module's UserLookupPort —
// the only file in `leads` allowed to import from `users` (ADR 0001).
// ============================================================================

import { getUser, getUserSummary, listUserSummaries } from "@/modules/users";
import type { UserLookupPort, UserLookupSummary } from "../../application/ports/UserLookupPort";

export class UsersModuleLookupAdapter implements UserLookupPort {
  async findById(userId: string): Promise<UserLookupSummary | null> {
    const summary = await getUserSummary(userId);
    if (!summary) return null;

    try {
      const user = await getUser(userId);
      return {
        id: user.id,
        organizationId: summary.organizationId,
        status: user.status,
        fullName: user.fullName,
        email: user.email,
        roleName: user.roleName,
        assignedTeamLeadId: user.assignedTeamLeadId,
        reportingManagerId: user.reportingManagerId,
      };
    } catch {
      return {
        id: summary.id,
        organizationId: summary.organizationId,
        status: summary.status,
        fullName: summary.fullName,
        email: summary.email,
      };
    }
  }

  async listByOrganization(organizationId: string): Promise<UserLookupSummary[]> {
    const users = await listUserSummaries(organizationId);
    return users.map((user) => ({
      id: user.id,
      organizationId: user.organizationId,
      status: user.status,
      fullName: user.fullName,
      email: user.email,
    }));
  }
}
