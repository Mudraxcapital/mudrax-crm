// ============================================================================
// src/app/api/leads/[id]/route.ts
//
// Lead API — GET (read one, requires `lead.view`) and PATCH (update,
// requires `lead.update`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  InvalidLeadSourceReferenceError,
  updateLead,
  updateLeadSchema,
} from "@/modules/leads";
import {
  LeadAccessDeniedError,
  requireAccessibleLead,
} from "@/modules/leads/presentation/controllers/requireLeadAccess";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const lead = await requireAccessibleLead(current.authContext, id, {
      permissionCode: "lead.view",
      actorUserId: current.session.user.id,
    });
    return NextResponse.json({ data: lead });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await requireAccessibleLead(current.authContext, id, {
      permissionCode: "lead.update",
      actorUserId: current.session.user.id,
    });
    const lead = await updateLead({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: lead });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (error instanceof InvalidLeadSourceReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
