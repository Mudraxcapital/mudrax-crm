// ============================================================================
// src/modules/rbac/domain/repositories/RbacRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaRbacRepository.
//
// `rbac` never imports `users`' Prisma model directly (ADR 0001 module
// boundary discipline — see rbac.prisma's UserRole comment); the User's
// current Team/Branch/Department pointers are obtained from `users`' own
// public API (see ../../application/use-cases/getAuthorizationContext.ts),
// not queried here.
// ============================================================================

import type { AuthorizationRole } from "../entities/AuthorizationContext";
import type { DataScope } from "../value-objects/DataScope";

export interface PermissionGrant {
  code: string;
  scope: DataScope;
}

export interface RbacRepository {
  /** Roles currently effective for a User (`effectiveFrom <= now < effectiveTo OR effectiveTo IS NULL`). */
  getEffectiveRolesForUser(userId: string): Promise<AuthorizationRole[]>;
  /** Permission -> Scope grants across the given Roles (not yet de-duplicated across Roles). */
  getPermissionGrantsForRoles(roleIds: string[]): Promise<PermissionGrant[]>;
}
