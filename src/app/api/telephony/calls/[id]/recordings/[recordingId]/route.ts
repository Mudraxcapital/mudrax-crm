// ============================================================================
// src/app/api/telephony/calls/[id]/recordings/[recordingId]/route.ts
//
// Call Recording metadata API — GET (read one, requires `call.view`) and
// PATCH (correct metadata, requires `call.recording.log`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CallRecordingNotFoundError,
  getCallRecording,
  updateCallRecording,
  updateCallRecordingSchema,
} from "@/modules/telephony";

interface RouteParams {
  params: Promise<{ id: string; recordingId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { recordingId } = await params;
  try {
    const recording = await getCallRecording(recordingId);
    return NextResponse.json({ data: recording });
  } catch (error) {
    if (error instanceof CallRecordingNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.recording.log")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { recordingId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateCallRecordingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const recording = await updateCallRecording({
      id: recordingId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: recording });
  } catch (error) {
    if (error instanceof CallRecordingNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
