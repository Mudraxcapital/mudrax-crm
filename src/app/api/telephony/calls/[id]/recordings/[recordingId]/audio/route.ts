// ============================================================================
// Call Recording audio upload (POST) and playback stream (GET).
// Bytes live on disk — DB keeps only the storage reference (ADR 0006).
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission } from "@/modules/rbac";
import {
  CallAttemptNotFoundError,
  CallRecordingAudioNotAvailableError,
  CallRecordingNotFoundError,
  getCallRecordingAudio,
  uploadCallRecordingAudio,
} from "@/modules/telephony";

interface RouteParams {
  params: Promise<{ id: string; recordingId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.recording.access")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, recordingId } = await params;
  try {
    const audio = await getCallRecordingAudio({
      callAttemptId: id,
      recordingId,
      organizationId: current.authContext.organizationId,
    });
    return new NextResponse(new Uint8Array(audio.content), {
      status: 200,
      headers: {
        "Content-Type": audio.contentType,
        "Content-Length": String(audio.content.byteLength),
        "Content-Disposition": `inline; filename="${audio.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (
      error instanceof CallAttemptNotFoundError ||
      error instanceof CallRecordingNotFoundError ||
      error instanceof CallRecordingAudioNotAvailableError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  if (!hasPermission(current.authContext, "call.recording.log")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, recordingId } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Multipart field `audio` (file) is required." },
      { status: 400 },
    );
  }

  const maxBytes = 25 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json(
      { error: "Audio file must be between 1 byte and 25 MB." },
      { status: 400 },
    );
  }

  const content = Buffer.from(await file.arrayBuffer());

  try {
    const recording = await uploadCallRecordingAudio({
      callAttemptId: id,
      recordingId,
      organizationId: current.authContext.organizationId,
      fileName: file.name || "recording.m4a",
      contentType: file.type || undefined,
      content,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    return NextResponse.json({ data: recording }, { status: 200 });
  } catch (error) {
    if (
      error instanceof CallAttemptNotFoundError ||
      error instanceof CallRecordingNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
