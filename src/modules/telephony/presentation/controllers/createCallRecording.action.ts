"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/createCallRecording.action.ts
//
// Server Action for logging Call Recording metadata. Requires
// `call.recording.log`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  CallAttemptNotFoundError,
  createCallRecording,
  createCallRecordingSchema,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function createCallRecordingAction(
  callAttemptId: string,
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session } = await requirePermission("call.recording.log");

  const durationRaw = formData.get("durationSeconds");
  const parsed = createCallRecordingSchema.safeParse({
    callAttemptId,
    storageReference: formData.get("storageReference"),
    durationSeconds: durationRaw ? Number(durationRaw) : undefined,
    startedAt: formData.get("startedAt") || new Date(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createCallRecording({
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof CallAttemptNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/telephony/calls/${callAttemptId}`);
  return {};
}
