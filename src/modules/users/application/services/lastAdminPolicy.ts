// ============================================================================
// src/modules/users/application/services/lastAdminPolicy.ts
//
// Ensures the company always retains at least one ACTIVE Admin.
// Uses a Serializable + FOR UPDATE guard so concurrent demote/disable/delete
// cannot race past the check.
// ============================================================================

import type { FixedUserRole, User, UserStatus } from "../../domain/entities/User";
import type { UserRepository } from "../../domain/repositories/UserRepository";

export async function assertKeepsActiveAdmin(input: {
  repository: UserRepository;
  target: User;
  targetRole: FixedUserRole | null;
  nextStatus?: UserStatus;
  nextRole?: FixedUserRole | null;
  deleting?: boolean;
}): Promise<void> {
  const { repository, target, targetRole, nextStatus, nextRole, deleting } = input;
  if (targetRole !== "Admin") return;
  if (target.status !== "ACTIVE") return;

  const wouldLeaveAdminRole =
    deleting === true ||
    (nextRole !== undefined && nextRole !== null && nextRole !== "Admin") ||
    (nextStatus !== undefined && nextStatus !== "ACTIVE");

  if (!wouldLeaveAdminRole) return;

  await repository.assertKeepsActiveAdminLocked(target.id);
}
