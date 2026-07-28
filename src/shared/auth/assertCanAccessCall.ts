// ============================================================================
// Shared Call Attempt ownership gate — pages, API routes, and server actions
// must apply the same hierarchy checks. Never rely on UI hiding alone.
// ============================================================================

import {
  canViewUserId,
  getPermissionScope,
  type AuthorizationContext,
} from "@/modules/rbac";

/** Minimal Call Attempt shape required for hierarchy / SELF checks. */
export interface CallAccessSubject {
  organizationId: string;
  agentUserId: string | null;
}

/**
 * Call visibility rules:
 * - Organization must match
 * - Caller / SELF scope → only the acting agent's own Calls
 * - Team Lead / Manager → agents in their hierarchy tree
 * - Admin → unrestricted within the Organization
 */
export function canAccessCall(
  authContext: AuthorizationContext,
  call: CallAccessSubject,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): boolean {
  if (call.organizationId !== authContext.organizationId) {
    return false;
  }

  const permissionCode = options?.permissionCode ?? "call.view";
  const scope = getPermissionScope(authContext, permissionCode);
  const actorUserId = options?.actorUserId ?? authContext.userId;

  if (scope === "SELF" || authContext.hierarchy.primaryRole === "Caller") {
    return call.agentUserId === actorUserId;
  }

  if (!call.agentUserId) {
    return (
      authContext.hierarchy.unrestricted ||
      authContext.hierarchy.primaryRole === "Admin" ||
      authContext.hierarchy.primaryRole === "Manager"
    );
  }

  return canViewUserId(authContext.hierarchy, call.agentUserId);
}

/**
 * Throws when the actor cannot access the Call Attempt.
 * Call after permission checks; treat denial like not-found at the boundary.
 */
export function assertCanAccessCall(
  authContext: AuthorizationContext,
  call: CallAccessSubject,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): void {
  if (!canAccessCall(authContext, call, options)) {
    throw new CallAccessDeniedError();
  }
}

export class CallAccessDeniedError extends Error {
  constructor(message = "Call not found or access denied.") {
    super(message);
    this.name = "CallAccessDeniedError";
  }
}
