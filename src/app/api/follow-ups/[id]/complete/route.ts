// ============================================================================
// src/app/api/follow-ups/[id]/complete/route.ts
//
// Follow-up completion API — POST, requires `follow_up.complete`.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  completeFollowUp,
  completeFollowUpSchema,
  FollowUpNotFoundError,
  FollowUpNotOpenError,
} from "@/modules/follow-ups";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
