"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/updateCallAttemptStatus.action.ts
//
// Server Action backing the Call Attempt lifecycle-status form. Requires
// `call.update`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  CallAttemptNotFoundError,
  InvalidCallOutcomeReferenceError,
  InvalidCallStatusTransitionError,
  updateCallAttemptStatus,
  updateCallAttemptStatusSchema,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function updateCallAttemptStatusAction(
  id: string,
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session } = await requirePermission("call.update");

  const parsed = updateCallAttemptStatusSchema.safeParse({
    status: formData.get("status"),
    disposition: formData.get("disposition") || undefined,
    callOutcomeId: formData.get("callOutcomeId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCallAttemptStatus({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof CallAttemptNotFoundError ||
      error instanceof InvalidCallStatusTransitionError ||
      error instanceof InvalidCallOutcomeReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/telephony/calls/${id}`);
  revalidatePath("/telephony/calls");
  revalidatePath("/telephony");
  return {};
}
