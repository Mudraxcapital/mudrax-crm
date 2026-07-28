import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  getNotification,
  listNotificationDeliveries,
  NotificationNotFoundError,
} from "@/modules/notifications";
import { canAccessNotification } from "@/shared/auth/notificationRecipientFilter";

export async function GET(request: Request,
  context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const notification = await getNotification(current.authContext.organizationId, id);
    // Prevent notification IDOR — Callers may only read notifications they receive.
    if (
      !canAccessNotification(current.authContext, notification, {
        permissionCode: "notification.view",
        actorUserId: current.session.user.id,
      })
    ) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    const deliveries = await listNotificationDeliveries(current.authContext.organizationId, id);
    return NextResponse.json({ data: { notification, deliveries } });
  } catch (error) {
    if (error instanceof NotificationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
