// ============================================================================
// src/app/api/follow-ups/route.ts
//
// Follow-up API — GET (list, requires `follow_up.view`) and POST (create,
// requires `follow_up.create`). `organizationId` always comes from the
// acting User's own Authorization Context, never from the request body.
// ============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import {
  createFollowUp,
  createFollowUpSchema,
  InvalidAssigneeReferenceError,
  InvalidLeadReferenceError,
  listFollowUps,
} from "@/modules/follow-ups";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "follow_up.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = getPermissionScope(current.authContext, "follow_up.view");
  const filter = scope === "SELF" ? { assignedToUserIds: [current.session.user.id] } : undefined;

  const followUps = await listFollowUps(current.authContext.organizationId, filter);
  return NextResponse.json({ data: followUps });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(current.authContext, "follow_up.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const followUp = await createFollowUp({
      organizationId: current.authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: followUp }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidAssigneeReferenceError
    ) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
