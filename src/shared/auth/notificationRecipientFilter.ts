// ============================================================================
// Notification list / detail recipient scoping for Callers (SELF).
// Filter at the repository query — never load org-wide then filter in memory.
// ============================================================================

import {
  getPermissionScope,
  isCallerWorkspaceUser,
  type AuthorizationContext,
} from "@/modules/rbac";

/** Compatible with notifications ListNotificationsFilter (query-level recipient scope). */
export interface NotificationRecipientQueryFilter {
  status?: string;
  recipientType?: "USER" | "CUSTOMER";
  recipientId?: string;
  limit?: number;
  offset?: number;
}

/** Repository filter fragment so Callers only see notifications addressed to them. */
export function notificationRecipientFilter(
  authContext: AuthorizationContext,
  options?: {
    permissionCode?: string;
    actorUserId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): NotificationRecipientQueryFilter {
  const permissionCode = options?.permissionCode ?? "notification.view";
  const actorUserId = options?.actorUserId ?? authContext.userId;
  const scope = getPermissionScope(authContext, permissionCode);

  const base: NotificationRecipientQueryFilter = {
    ...(options?.status ? { status: options.status } : {}),
    ...(options?.limit != null ? { limit: options.limit } : {}),
    ...(options?.offset != null ? { offset: options.offset } : {}),
  };

  if (isCallerWorkspaceUser(authContext) || scope === "SELF") {
    return {
      ...base,
      recipientType: "USER",
      recipientId: actorUserId,
    };
  }

  return base;
}

/** True when the authenticated user may view this notification (recipient check for Callers). */
export function canAccessNotification(
  authContext: AuthorizationContext,
  notification: { recipientType: string; recipientId: string },
  options?: {
    permissionCode?: string;
    actorUserId?: string;
  },
): boolean {
  const permissionCode = options?.permissionCode ?? "notification.view";
  const actorUserId = options?.actorUserId ?? authContext.userId;
  const scope = getPermissionScope(authContext, permissionCode);

  if (isCallerWorkspaceUser(authContext) || scope === "SELF") {
    return notification.recipientType === "USER" && notification.recipientId === actorUserId;
  }

  return true;
}
