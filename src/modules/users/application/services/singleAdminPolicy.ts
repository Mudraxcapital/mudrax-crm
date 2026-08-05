// ============================================================================
// src/modules/users/application/services/singleAdminPolicy.ts
//
// The company may hold exactly one Admin account. Creating or promoting a
// second Admin is rejected. Complements lastAdminPolicy (cannot remove the
// last ACTIVE Admin).
// ============================================================================

import { SingleAdminLimitError } from "../../domain/errors/UserErrors";
import type { UserRepository } from "../../domain/repositories/UserRepository";

export async function assertSingleAdminSlotAvailable(
  repository: UserRepository,
  excludingUserId?: string | null,
): Promise<void> {
  const otherAdmins = await repository.countUsersWithRole("Admin", excludingUserId);
  if (otherAdmins > 0) {
    throw new SingleAdminLimitError();
  }
}
