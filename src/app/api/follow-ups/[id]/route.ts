// ============================================================================
// src/app/api/follow-ups/[id]/route.ts
//
// Follow-up API — GET (read one, requires `follow_up.view`) and PATCH
// (reschedule/edit, requires `follow_up.create`).
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  FollowUpNotFoundError,
  FollowUpNotOpenError,
  updateFollowUp,
  updateFollowUpSchema,
} from "@/modules/follow-ups";
import { requireFollowUpAccess } from "@/shared/auth/requireFollowUpAccess";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "follow_up.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const { followUp } = await requireFollowUpAccess(current.authContext, id, {
      permissionCode: "lead.view",
      actorUserId: current.session.user.id,
    });
    return NextResponse.json({ data: followUp });
  } catch (error) {
    if (error instanceof FollowUpNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "follow_up.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await requireFollowUpAccess(current.authContext, id, {
      permissionCode: "lead.view",
      actorUserId: current.session.user.id,
    });
    const followUp = await updateFollowUp({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: followUp });
  } catch (error) {
    if (error instanceof FollowUpNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof FollowUpNotOpenError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
