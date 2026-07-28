import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { getAnalyticsDashboard, toReportFilter } from "@/modules/reports";
import { reportHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "report.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const filter = {
    ...toReportFilter({
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
      branchId: url.searchParams.get("branchId"),
      departmentId: url.searchParams.get("departmentId"),
      teamId: url.searchParams.get("teamId"),
      userId: url.searchParams.get("userId"),
    }),
    ...reportHierarchyFilter(current.authContext),
  };

  const dashboard = await getAnalyticsDashboard(current.authContext.organizationId, filter);
  return NextResponse.json({ data: dashboard });
}
