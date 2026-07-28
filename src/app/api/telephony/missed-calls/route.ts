// ============================================================================
// src/app/api/telephony/missed-calls/route.ts
//
// Missed Calls API — GET (a filtered view of Call Attempts, requires
// `call.view`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { listMissedCalls } from "@/modules/telephony";
import { agentHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filter = agentHierarchyFilter(current.authContext);
  const calls = await listMissedCalls(current.authContext.organizationId, filter);
  return NextResponse.json({ data: calls });
}
