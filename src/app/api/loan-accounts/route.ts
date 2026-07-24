import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listLoanAccounts } from "@/modules/loan-accounts";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(current.authContext, "loan_account.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await listLoanAccounts(current.authContext.organizationId);
  return NextResponse.json({ data });
}
