"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/updateCallOutcome.action.ts
//
// Server Action backing the Call Outcome catalog edit form. Requires
// `call.outcome.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  CallOutcomeNotFoundError,
  DuplicateCallOutcomeNameError,
  updateCallOutcome,
  updateCallOutcomeSchema,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function updateCallOutcomeAction(
  id: string,
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session } = await requirePermission("call.outcome.manage");

  const sortOrderRaw = formData.get("sortOrder");
  const parsed = updateCallOutcomeSchema.safeParse({
    name: formData.get("name") || undefined,
    isActive: formData.get("isActive") === "on",
    sortOrder: sortOrderRaw ? Number(sortOrderRaw) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCallOutcome({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof CallOutcomeNotFoundError ||
      error instanceof DuplicateCallOutcomeNameError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/telephony/outcomes");
  return {};
}
