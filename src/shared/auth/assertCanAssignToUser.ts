// ============================================================================
// Shared assignee gate — Callers (SELF) may only assign to themselves;
// other roles may assign within hierarchy.visibleUserIds.
// ============================================================================

import {
  canViewUserId,
  getPermissionScope,
  isCallerWorkspaceUser,
  type AuthorizationContext,
} from "@/modules/rbac";

/**
 * Whether the actor may set `targetUserId` as an assignee on a Lead / Follow-up.
 * Callers and SELF-scoped actors are restricted to themselves.
 */
export function canAssignToUser(
  authContext: AuthorizationContext,
  targetUserId: string,
  options?: {
    /** Permission whose Data Scope drives SELF (default: lead.create). */
    permissionCode?: string;
    actorUserId?: string;
  },
): boolean {
  const actorUserId = options?.actorUserId ?? authContext.userId;
  const permissionCode = options?.permissionCode ?? "lead.create";
  const scope = getPermissionScope(authContext, permissionCode);

  if (isCallerWorkspaceUser(authContext) || scope === "SELF") {
    return targetUserId === actorUserId;
  }

  return canViewUserId(authContext.hierarchy, targetUserId);
}

export function assertCanAssignToUser(
  authContext: AuthorizationContext,
  targetUserId: string,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): void {
  if (!canAssignToUser(authContext, targetUserId, options)) {
    throw new AssigneeNotAllowedError();
  }
}

export class AssigneeNotAllowedError extends Error {
  constructor(message = "Cannot assign to a user outside your hierarchy scope.") {
    super(message);
    this.name = "AssigneeNotAllowedError";
  }
}
