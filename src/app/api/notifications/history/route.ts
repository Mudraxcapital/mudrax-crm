import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { listNotificationHistory } from "@/modules/notifications";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "notification.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const notificationId = url.searchParams.get("notificationId") ?? undefined;
  const history = await listNotificationHistory(current.authContext.organizationId, notificationId);
  return NextResponse.json({ data: history });
}
