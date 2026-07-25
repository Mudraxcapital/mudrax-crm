// ============================================================================
// src/app/api/telephony/calls/route.ts
//
// Call Attempt API — GET (list Call Logs/History, requires `call.view`) and
// POST (Click-to-Call, requires `call.initiate`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  initiateClickToCall,
  initiateClickToCallSchema,
  InvalidAgentReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  listCallAttempts,
} from "@/modules/telephony";
import { agentHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agentFilter = agentHierarchyFilter(current.authContext);
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;

  const filter = {
    ...agentFilter,
    ...(leadId ? { leadId } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const calls = await listCallAttempts(current.authContext.organizationId, filter);
  return NextResponse.json({ data: calls });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "call.initiate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = initiateClickToCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const call = await initiateClickToCall({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: call }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidAgentReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
