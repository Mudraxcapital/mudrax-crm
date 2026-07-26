// ============================================================================
// src/app/api/leads/[id]/notes/route.ts
//
// Lead Notes API — GET (list, requires `lead.view`) and POST (add, requires
// `lead.update`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { addLeadNote, createLeadNoteSchema, listLeadNotes } from "@/modules/leads";
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
    await requireAccessibleLead(current.authContext, id, {
      permissionCode: "lead.view",
      actorUserId: current.session.user.id,
    });
    const notes = await listLeadNotes(id);
    return NextResponse.json({ data: notes });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "lead.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createLeadNoteSchema.safeParse(body);
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
    const note = await addLeadNote({
      leadId: id,
      authorUserId: current.session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    throw error;
  }
}
