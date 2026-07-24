"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/updateCallRecording.action.ts
//
// Server Action for correcting Call Recording metadata. Requires
// `call.recording.log`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  CallRecordingNotFoundError,
  updateCallRecording,
  updateCallRecordingSchema,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function updateCallRecordingAction(
  callAttemptId: string,
  recordingId: string,
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session } = await requirePermission("call.recording.log");

  const durationRaw = formData.get("durationSeconds");
  const parsed = updateCallRecordingSchema.safeParse({
    durationSeconds: durationRaw ? Number(durationRaw) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCallRecording({
      id: recordingId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof CallRecordingNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/telephony/calls/${callAttemptId}`);
  return {};
}
