"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/updateCallNote.action.ts
//
// Server Action for editing a Call Note. Requires `call.note.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { CallNoteNotFoundError, updateCallNote, updateCallNoteSchema } from "@/modules/telephony";
import { requirePermission } from "@/infra/auth/session";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function updateCallNoteAction(
  callAttemptId: string,
  noteId: string,
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session } = await requirePermission("call.note.manage");

  const parsed = updateCallNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCallNote({
      id: noteId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof CallNoteNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/telephony/calls/${callAttemptId}`);
  return {};
}
