// ============================================================================
// src/modules/users/application/ports/RoleAssignmentPort.ts
// ============================================================================

import type { FixedUserRole } from "../../domain/entities/User";

export interface RoleAssignmentPort {
  listFixedRoles(): Promise<{ id: string; name: FixedUserRole }[]>;
  getPrimaryRoleName(userId: string): Promise<FixedUserRole | null>;
  getPermissionCodesForUser(userId: string): Promise<string[]>;
  assignFixedRole(
    userId: string,
    roleName: FixedUserRole,
    assignedByUserId: string | null,
  ): Promise<{ previousRole: FixedUserRole | null; nextRole: FixedUserRole }>;
}
