// ============================================================================
// src/app/api/follow-ups/route.ts
//
// Follow-up API — GET (list, requires `follow_up.view`) and POST (create,
// requires `follow_up.create`). `organizationId` always comes from the
// acting User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import {
  createFollowUp,
  createFollowUpSchema,
  InvalidAssigneeReferenceError,
  InvalidLeadReferenceError,
  listFollowUps,
} from "@/modules/follow-ups";
import { getLead, LeadNotFoundError } from "@/modules/leads";
import {
  assertCanAccessLead,
  LeadAccessDeniedError,
} from "@/shared/auth/assertCanAccessLead";
import {
  assertCanAssignToUser,
  AssigneeNotAllowedError,
} from "@/shared/auth/assertCanAssignToUser";
import { followUpListFilter } from "@/shared/auth/applyHierarchyListFilter";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "follow_up.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
  const offsetRaw = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const filter = followUpListFilter(current.authContext, {
    permissionCode: "follow_up.view",
    actorUserId: current.session.user.id,
  });

  const followUps = await listFollowUps(current.authContext.organizationId, {
    ...filter,
    limit,
    offset,
  });
  return NextResponse.json({ data: followUps, meta: { limit, offset } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "follow_up.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const callerWorkspace = isCallerWorkspaceUser(current.authContext);
  const parsed = createFollowUpSchema.safeParse({
    ...body,
    // Callers may only assign follow-ups to themselves.
    currentAssigneeUserId: callerWorkspace
      ? current.session.user.id
      : body?.currentAssigneeUserId,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const lead = await getLead(parsed.data.leadId);
    assertCanAccessLead(current.authContext, lead, {
      permissionCode: "lead.view",
      actorUserId: current.session.user.id,
    });

    const assigneeId =
      parsed.data.currentAssigneeUserId ?? lead.currentAssigneeUserId ?? current.session.user.id;
    assertCanAssignToUser(current.authContext, assigneeId, {
      permissionCode: "follow_up.create",
      actorUserId: current.session.user.id,
    });

    const followUp = await createFollowUp({
      organizationId: current.authContext.organizationId,
      input: {
        ...parsed.data,
        currentAssigneeUserId: assigneeId,
      },
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: followUp }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidAssigneeReferenceError ||
      error instanceof LeadNotFoundError ||
      error instanceof LeadAccessDeniedError ||
      error instanceof AssigneeNotAllowedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
