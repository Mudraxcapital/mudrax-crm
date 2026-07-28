// ============================================================================
// src/app/api/telephony/dashboard/route.ts
//
// Telephony Dashboard API — GET, requires `telephony.dashboard.view`.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { getTelephonyDashboard } from "@/modules/telephony";
import { agentHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "telephony.dashboard.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agentScope = agentHierarchyFilter(current.authContext);
  const dashboard = await getTelephonyDashboard(
    current.authContext.organizationId,
    new Date(),
    agentScope,
  );
  return NextResponse.json({ data: dashboard });
}
