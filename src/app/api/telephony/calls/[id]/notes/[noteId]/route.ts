// ============================================================================
// src/app/api/telephony/calls/[id]/notes/[noteId]/route.ts
//
// Call Note API — PATCH (edit, requires `call.note.manage`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import { CallNoteNotFoundError, updateCallNote, updateCallNoteSchema } from "@/modules/telephony";

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.note.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { noteId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateCallNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const note = await updateCallNote({
      id: noteId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: note });
  } catch (error) {
    if (error instanceof CallNoteNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
