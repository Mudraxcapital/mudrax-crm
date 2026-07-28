import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { getNotificationsDashboard } from "@/modules/notifications";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "notifications.dashboard.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dashboard = await getNotificationsDashboard(current.authContext.organizationId);
  return NextResponse.json({ data: dashboard });
}
