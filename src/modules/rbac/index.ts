// Public API of the `rbac` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaRbacRepository } from "./infrastructure/repositories/PrismaRbacRepository";
import { makeGetAuthorizationContext } from "./application/use-cases/getAuthorizationContext";

export type {
  AuthorizationContext,
  AuthorizationRole,
} from "./domain/entities/AuthorizationContext";
export { hasPermission, hasRole, getPermissionScope } from "./domain/entities/AuthorizationContext";
export {
  DATA_SCOPES,
  widerScope,
  scopeAtLeast,
  type DataScope,
} from "./domain/value-objects/DataScope";

export const getAuthorizationContext = makeGetAuthorizationContext(
  new PrismaRbacRepository(prisma),
);
