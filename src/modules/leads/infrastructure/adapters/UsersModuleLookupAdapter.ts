// ============================================================================
// src/modules/leads/infrastructure/adapters/UsersModuleLookupAdapter.ts
//
// Adapts `users`' public API (index.ts) to this module's UserLookupPort —
// the only file in `leads` allowed to import from `users` (ADR 0001).
// ============================================================================

import { getUserSummary, listUserSummaries } from "@/modules/users";
import type { UserLookupPort, UserLookupSummary } from "../../application/ports/UserLookupPort";

export class UsersModuleLookupAdapter implements UserLookupPort {
  async findById(userId: string): Promise<UserLookupSummary | null> {
    const user = await getUserSummary(userId);
    if (!user) return null;
    return {
      id: user.id,
      organizationId: user.organizationId,
      status: user.status,
      fullName: user.fullName,
      email: user.email,
    };
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
