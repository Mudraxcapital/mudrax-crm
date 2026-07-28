// ============================================================================
// src/app/api/telephony/calls/[id]/recordings/route.ts
//
// Call Recording metadata API — GET (list, requires `call.view`) and POST
// (log metadata, requires `call.recording.log`).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CallAttemptNotFoundError,
  createCallRecording,
  createCallRecordingSchema,
  listCallRecordings,
} from "@/modules/telephony";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const recordings = await listCallRecordings(id);
  return NextResponse.json({ data: recordings });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.recording.log")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createCallRecordingSchema.safeParse({ ...body, callAttemptId: id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const recording = await createCallRecording({
      input: parsed.data,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: recording }, { status: 201 });
  } catch (error) {
    if (error instanceof CallAttemptNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
