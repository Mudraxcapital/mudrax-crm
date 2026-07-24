import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getAnalyticsDashboard, toReportFilter } from "@/modules/reports";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const filter = toReportFilter({
    dateFrom: url.searchParams.get("dateFrom"),
    dateTo: url.searchParams.get("dateTo"),
    branchId: url.searchParams.get("branchId"),
    departmentId: url.searchParams.get("departmentId"),
    teamId: url.searchParams.get("teamId"),
    userId: url.searchParams.get("userId"),
  });

  const dashboard = await getAnalyticsDashboard(current.authContext.organizationId, filter);
  return NextResponse.json({ data: dashboard });
}
