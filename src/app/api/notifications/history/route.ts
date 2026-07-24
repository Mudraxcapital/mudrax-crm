import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listNotificationHistory } from "@/modules/notifications";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const notificationId = url.searchParams.get("notificationId") ?? undefined;
  const history = await listNotificationHistory(current.authContext.organizationId, notificationId);
  return NextResponse.json({ data: history });
}
