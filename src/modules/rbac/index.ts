// Public API of the `rbac` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaRbacRepository } from "./infrastructure/repositories/PrismaRbacRepository";
import { makeGetAuthorizationContext } from "./application/use-cases/getAuthorizationContext";
import {
  makeAssignFixedRole,
  makeGetPermissionCodesForUser,
  makeGetPrimaryRoleName,
  makeListFixedRoles,
} from "./application/use-cases/assignFixedRole";

export type {
  AuthorizationContext,
  AuthorizationRole,
} from "./domain/entities/AuthorizationContext";
export {
  hasPermission,
  hasRole,
  getPermissionScope,
  isInternalStaff,
  isCallerWorkspaceUser,
  INTERNAL_STAFF_ROLES,
  ELEVATED_STAFF_ROLES,
} from "./domain/entities/AuthorizationContext";
export { FIXED_ROLES, type FixedRoleName } from "./domain/entities/FixedRoles";
export {
  DATA_SCOPES,
  widerScope,
  scopeAtLeast,
  type DataScope,
} from "./domain/value-objects/DataScope";
export {
  ownershipFilterFromHierarchy,
  assertOwnsManagerData,
  canViewUserId,
  type HierarchyScope,
  type HierarchyPrimaryRole,
  type OwnershipQueryFilter,
} from "./domain/value-objects/HierarchyScope";
export {
  resolveOwnerManagerId,
  requireOwnerManagerId,
} from "./application/services/resolveOwnerManagerId";

const rbacRepository = new PrismaRbacRepository(prisma);

export const getAuthorizationContext = makeGetAuthorizationContext(rbacRepository);
export const assignFixedRole = makeAssignFixedRole(rbacRepository);
export const listFixedRoles = makeListFixedRoles(rbacRepository);
export const getPrimaryRoleName = makeGetPrimaryRoleName(rbacRepository);
export const getPermissionCodesForUser = makeGetPermissionCodesForUser(rbacRepository);
