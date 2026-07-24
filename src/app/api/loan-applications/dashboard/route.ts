import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getLoanDashboard } from "@/modules/loan-applications";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(current.authContext, "loan_application.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await getLoanDashboard(current.authContext.organizationId);
  return NextResponse.json({ data });
}
