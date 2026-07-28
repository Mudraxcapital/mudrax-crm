// ============================================================================
// Administrative password reset — Admin only, never for Admin targets or self.
// Sets mustChangePassword so the user must change password on next login.
// ============================================================================

import type { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { validatePasswordPolicy } from "@/modules/auth/domain/policies/passwordPolicy";
import type { HierarchyScope } from "@/modules/rbac";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserAuditActor } from "../../domain/entities/UserAuditRecord";
import {
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
  UserNotFoundError,
} from "../../domain/errors/UserErrors";
import type { RoleAssignmentPort } from "../ports/RoleAssignmentPort";
import { roleMaySelfServiceChangePassword } from "../services/selfServicePasswordPolicy";

export interface ResetPasswordCommand {
  userId: string;
  password: string;
  actorRoles: string[];
  hierarchy: HierarchyScope;
  actor: UserAuditActor;
  ipAddress?: string | null;
  correlationId?: string | null;
}

export function makeResetPassword(
  repository: UserRepository,
  roles: RoleAssignmentPort,
  passwordHasher: PasswordHasher,
) {
  return async function resetPassword(command: ResetPasswordCommand): Promise<void> {
    const { userId, password, actorRoles, actor, ipAddress, correlationId } = command;

    if (!actorRoles.includes("Admin") && command.hierarchy.primaryRole !== "Admin") {
      throw new AdminRoleProtectedError("Only Admins can reset passwords.");
    }

    if (actor.actorId === userId) {
      throw new InvalidUserHierarchyError(
        "Admins cannot reset their own password here. Use Profile → Security → Change Password.",
      );
    }

    const user = await repository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const targetRole = await roles.getPrimaryRoleName(userId);
    if (targetRole === "Admin") {
      throw new AdminRoleProtectedError(
        "Admins cannot reset passwords for other Admins. That Admin must use Profile → Security → Change Password.",
      );
    }
    if (targetRole !== "Manager" && targetRole !== "Team Lead" && targetRole !== "Caller") {
      throw new InvalidUserHierarchyError(
        "Password reset is only allowed for Managers, Team Leads, and Callers.",
      );
    }

    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      throw new InvalidUserHierarchyError(policyError);
    }

    const passwordHash = await passwordHasher.hash(password);
    await repository.setPasswordHashWithAudit(userId, passwordHash, actor, correlationId, {
      mustChangePassword: roleMaySelfServiceChangePassword(targetRole),
      action: "Password Reset (Admin)",
      ipAddress: ipAddress ?? null,
    });
  };
}
