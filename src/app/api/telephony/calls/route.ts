// ============================================================================
// src/app/api/telephony/calls/route.ts
//
// Call Attempt API — GET (list Call Logs/History, requires `call.view`) and
// POST (Click-to-Call, requires `call.initiate`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { getLead, LeadNotFoundError } from "@/modules/leads";
import {
  initiateClickToCall,
  initiateClickToCallSchema,
  InvalidAgentReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  listCallAttempts,
} from "@/modules/telephony";
import { agentHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";
import {
  assertCanAccessLead,
  LeadAccessDeniedError,
} from "@/shared/auth/assertCanAccessLead";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agentFilter = agentHierarchyFilter(current.authContext);
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const limitRaw = Number(url.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
  const offsetRaw = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const filter = {
    ...agentFilter,
    ...(leadId ? { leadId } : {}),
    ...(customerId ? { customerId } : {}),
    limit,
    offset,
  };

  const calls = await listCallAttempts(current.authContext.organizationId, filter);
  return NextResponse.json({ data: calls, meta: { limit, offset } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.initiate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const callerWorkspace = isCallerWorkspaceUser(current.authContext);
  const parsed = initiateClickToCallSchema.safeParse({
    ...body,
    // Callers may only place calls as themselves.
    agentUserId: callerWorkspace
      ? current.session.user.id
      : (body?.agentUserId ?? current.session.user.id),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    // Callers (SELF) may only initiate calls for leads assigned to them.
    if (parsed.data.leadId) {
      const lead = await getLead(parsed.data.leadId);
      assertCanAccessLead(current.authContext, lead, {
        permissionCode: "lead.view",
        actorUserId: current.session.user.id,
      });
    }

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
      error instanceof InvalidAgentReferenceError ||
      error instanceof LeadNotFoundError ||
      error instanceof LeadAccessDeniedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
