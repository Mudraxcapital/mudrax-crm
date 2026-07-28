// ============================================================================
// src/app/api/leads/[id]/assign/route.ts
//
// Lead Assignment API — POST, requires `lead.reassign`.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  assignLead,
  assignLeadSchema,
  InvalidAssigneeReferenceError,
} from "@/modules/leads";
import {
  LeadAccessDeniedError,
  requireAccessibleLead,
} from "@/modules/leads/presentation/controllers/requireLeadAccess";
import {
  assertCanAssignToUser,
  AssigneeNotAllowedError,
} from "@/shared/auth/assertCanAssignToUser";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;

  if (!hasPermission(current.authContext, "lead.reassign")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = assignLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await requireAccessibleLead(current.authContext, id, {
      permissionCode: "lead.reassign",
      actorUserId: current.session.user.id,
    });
    assertCanAssignToUser(current.authContext, parsed.data.assignedToUserId, {
      permissionCode: "lead.reassign",
      actorUserId: current.session.user.id,
    });
    const lead = await assignLead({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: lead });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (
      error instanceof InvalidAssigneeReferenceError ||
      error instanceof AssigneeNotAllowedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
