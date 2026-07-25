// ============================================================================
// src/modules/users/infrastructure/adapters/RbacRoleAssignmentAdapter.ts
// ============================================================================

import {
  assignFixedRole,
  getPermissionCodesForUser,
  getPrimaryRoleName,
  listFixedRoles,
  type FixedRoleName,
} from "@/modules/rbac";
import type { RoleAssignmentPort } from "../../application/ports/RoleAssignmentPort";
import type { FixedUserRole } from "../../domain/entities/User";

export class RbacRoleAssignmentAdapter implements RoleAssignmentPort {
  async listFixedRoles(): Promise<{ id: string; name: FixedUserRole }[]> {
    const roles = await listFixedRoles();
    return roles.map((role) => ({ id: role.id, name: role.name as FixedUserRole }));
  }

  async getPrimaryRoleName(userId: string): Promise<FixedUserRole | null> {
    return (await getPrimaryRoleName(userId)) as FixedUserRole | null;
  }

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    return getPermissionCodesForUser(userId);
  }

  async assignFixedRole(
    userId: string,
    roleName: FixedUserRole,
    assignedByUserId: string | null,
  ): Promise<{ previousRole: FixedUserRole | null; nextRole: FixedUserRole }> {
    const result = await assignFixedRole(userId, roleName as FixedRoleName, assignedByUserId);
    return {
      previousRole: result.previousRole as FixedUserRole | null,
      nextRole: result.nextRole as FixedUserRole,
    };
  }
}
