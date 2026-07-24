"use server";

// ============================================================================
// src/modules/telephony/presentation/controllers/createCallOutcome.action.ts
//
// Server Action backing the Call Outcome catalog creation form. Requires
// `call.outcome.manage`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createCallOutcome,
  createCallOutcomeSchema,
  DuplicateCallOutcomeNameError,
} from "@/modules/telephony";
import type { TelephonyFormState } from "./initiateClickToCall.action";

export async function createCallOutcomeAction(
  _previousState: TelephonyFormState | undefined,
  formData: FormData,
): Promise<TelephonyFormState> {
  const { session, authContext } = await requirePermission("call.outcome.manage");

  const sortOrderRaw = formData.get("sortOrder");
  const parsed = createCallOutcomeSchema.safeParse({
    name: formData.get("name"),
    sortOrder: sortOrderRaw ? Number(sortOrderRaw) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createCallOutcome({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateCallOutcomeNameError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/telephony/outcomes");
  return {};
}
