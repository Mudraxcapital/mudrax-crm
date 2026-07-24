"use server";

// ============================================================================
// src/modules/follow-ups/presentation/controllers/reassignFollowUp.action.ts
//
// Server Action for reassigning an open Follow-up to another Caller.
// Requires `follow_up.reassign` (Team Leader+).
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  FollowUpNotFoundError,
  FollowUpNotOpenError,
  InvalidAssigneeReferenceError,
  reassignFollowUp,
  reassignFollowUpSchema,
} from "@/modules/follow-ups";
import { requirePermission } from "@/infra/auth/session";
import type { FollowUpFormState } from "./createFollowUp.action";

export async function reassignFollowUpAction(
  leadId: string,
  id: string,
  _previousState: FollowUpFormState | undefined,
  formData: FormData,
): Promise<FollowUpFormState> {
  const { session } = await requirePermission("follow_up.reassign");

  const parsed = reassignFollowUpSchema.safeParse({
    toUserId: formData.get("toUserId"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await reassignFollowUp({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof FollowUpNotFoundError ||
      error instanceof FollowUpNotOpenError ||
      error instanceof InvalidAssigneeReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/follow-ups");
  return {};
}
