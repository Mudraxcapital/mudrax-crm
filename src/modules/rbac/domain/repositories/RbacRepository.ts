// ============================================================================
// src/modules/rbac/domain/repositories/RbacRepository.ts
// ============================================================================

import type { AuthorizationRole } from "../entities/AuthorizationContext";
import type { FixedRoleName } from "../entities/FixedRoles";
import type { DataScope } from "../value-objects/DataScope";

export interface PermissionGrant {
  code: string;
  scope: DataScope;
}

export interface RbacRepository {
  getEffectiveRolesForUser(userId: string): Promise<AuthorizationRole[]>;
  getPermissionGrantsForRoles(roleIds: string[]): Promise<PermissionGrant[]>;

  listFixedRoles(): Promise<{ id: string; name: FixedRoleName }[]>;
  getPrimaryRoleName(userId: string): Promise<string | null>;
  replaceUserFixedRole(
    userId: string,
    roleName: FixedRoleName,
    assignedByUserId: string | null,
  ): Promise<void>;
}
