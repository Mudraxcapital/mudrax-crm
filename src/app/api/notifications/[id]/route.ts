import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  getNotification,
  listNotificationDeliveries,
  NotificationNotFoundError,
} from "@/modules/notifications";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const notification = await getNotification(current.authContext.organizationId, id);
    const deliveries = await listNotificationDeliveries(current.authContext.organizationId, id);
    return NextResponse.json({ data: { notification, deliveries } });
  } catch (error) {
    if (error instanceof NotificationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
