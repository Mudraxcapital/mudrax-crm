// ============================================================================
// src/app/api/follow-ups/[id]/complete/route.ts
//
// Follow-up completion API — POST, requires `follow_up.complete`.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  completeFollowUp,
  completeFollowUpSchema,
  FollowUpNotFoundError,
  FollowUpNotOpenError,
} from "@/modules/follow-ups";
import { requireFollowUpAccess } from "@/shared/auth/requireFollowUpAccess";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "follow_up.complete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = completeFollowUpSchema.safeParse(body);
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
    const followUp = await completeFollowUp({
      id,
      completedByUserId: current.session.user.id,
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
