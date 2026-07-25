// ============================================================================
// src/app/api/leads/route.ts
//
// Lead API — GET (list, requires `lead.view`) and POST (create, requires
// `lead.create`). `organizationId` always comes from the acting User's own
// Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
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
import { leadHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Hierarchy + Caller SELF — never trust client filters.
  const hierarchyFilter = leadHierarchyFilter(current.authContext);
  const filter =
    isCallerWorkspaceUser(current.authContext)
      ? {
          ...hierarchyFilter,
          assignedToUserIds: [current.session.user.id],
        }
      : hierarchyFilter;

  const leads = await listLeads(current.authContext.organizationId, filter);
  return NextResponse.json({ data: leads });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    const lead = await createLead({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
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
      error instanceof InvalidAssigneeReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
