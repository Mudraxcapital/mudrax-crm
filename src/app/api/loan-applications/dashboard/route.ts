import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { getLoanDashboard } from "@/modules/loan-applications";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "loan_application.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await getLoanDashboard(current.authContext.organizationId);
  return NextResponse.json({ data });
}
