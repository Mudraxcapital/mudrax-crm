// ============================================================================
// src/app/api/leads/route.ts
//
// Lead API — GET (list, requires `lead.view`) and POST (create, requires
// `lead.create`). `organizationId` always comes from the acting User's own
// Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission, isCallerWorkspaceUser, resolveOwnerManagerId } from "@/modules/rbac";
import {
  createLead,
  createLeadSchema,
  InvalidAssigneeReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
  listLeads,
} from "@/modules/leads";
import { visibleLeadsFilter } from "@/shared/auth/applyHierarchyListFilter";
import {
  assertCanAssignToUser,
  AssigneeNotAllowedError,
} from "@/shared/auth/assertCanAssignToUser";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
  const offsetRaw = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const filter = {
    ...visibleLeadsFilter(current.authContext, {
      permissionCode: "lead.view",
      actorUserId: current.session.user.id,
    }),
    limit,
    offset,
  };

  const leads = await listLeads(current.authContext.organizationId, filter);
  return NextResponse.json({ data: leads, meta: { limit, offset } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "lead.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const input = { ...parsed.data };
    // Callers may only assign to themselves (SELF hierarchy).
    if (isCallerWorkspaceUser(current.authContext)) {
      input.currentAssigneeUserId = current.session.user.id;
    } else if (input.currentAssigneeUserId) {
      assertCanAssignToUser(current.authContext, input.currentAssigneeUserId, {
        permissionCode: "lead.create",
        actorUserId: current.session.user.id,
      });
    }

    const lead = await createLead({
      organizationId: current.authContext.organizationId,
      input,
      actor: { actorType: "USER", actorId: current.session.user.id },
      ownerManagerId: resolveOwnerManagerId(current.authContext),
      ownerTeamLeadId: current.authContext.hierarchy.teamLeadId,
    });
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidLeadSourceReferenceError ||
      error instanceof InvalidLeadStageReferenceError ||
      error instanceof InvalidAssigneeReferenceError ||
      error instanceof AssigneeNotAllowedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
