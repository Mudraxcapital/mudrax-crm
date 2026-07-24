// ============================================================================
// src/app/api/telephony/missed-calls/route.ts
//
// Missed Calls API — GET (a filtered view of Call Attempts, requires
// `call.view`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { listMissedCalls } from "@/modules/telephony";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = getPermissionScope(current.authContext, "call.view");
  const filter = scope === "SELF" ? { agentUserId: current.session.user.id } : undefined;

  const calls = await listMissedCalls(current.authContext.organizationId, filter);
  return NextResponse.json({ data: calls });
}
