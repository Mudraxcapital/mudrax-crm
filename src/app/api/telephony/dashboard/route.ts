// ============================================================================
// src/app/api/telephony/dashboard/route.ts
//
// Telephony Dashboard API — GET, requires `telephony.dashboard.view`.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getTelephonyDashboard } from "@/modules/telephony";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "telephony.dashboard.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dashboard = await getTelephonyDashboard(current.authContext.organizationId);
  return NextResponse.json({ data: dashboard });
}
