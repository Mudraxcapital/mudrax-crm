"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/addCallNote.action.ts
//
// Server Action for adding a Call Note. Requires `call.note.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  addCallNote,
  CallAttemptNotFoundError,
  createCallNoteSchema,
  getCallAttempt,
} from "@/modules/telephony";
import { requirePermission } from "@/infra/auth/session";
import { canAccessCall } from "@/shared/auth/assertCanAccessCall";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function addCallNoteAction(
  callAttemptId: string,
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session, authContext } = await requirePermission("call.note.manage");

  const parsed = createCallNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const existing = await getCallAttempt(callAttemptId);
    if (!canAccessCall(authContext, existing, { permissionCode: "call.note.manage" })) {
      return { error: "Call not found or access denied." };
    }

    await addCallNote({
      callAttemptId,
      authorUserId: session.user.id,
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
