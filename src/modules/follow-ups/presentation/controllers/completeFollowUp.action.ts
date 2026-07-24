"use server";

// ============================================================================
// src/modules/follow-ups/presentation/controllers/completeFollowUp.action.ts
//
// Server Action for marking an open Follow-up Completed with an outcome.
// Requires `follow_up.complete`.
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  completeFollowUp,
  completeFollowUpSchema,
  FollowUpNotFoundError,
  FollowUpNotOpenError,
} from "@/modules/follow-ups";
import { requirePermission } from "@/infra/auth/session";
import type { FollowUpFormState } from "./createFollowUp.action";

export async function completeFollowUpAction(
  leadId: string,
  id: string,
  _previousState: FollowUpFormState | undefined,
  formData: FormData,
): Promise<FollowUpFormState> {
  const { session } = await requirePermission("follow_up.complete");

  const parsed = completeFollowUpSchema.safeParse({
    outcomeNotes: formData.get("outcomeNotes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await completeFollowUp({
      id,
      completedByUserId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof FollowUpNotFoundError || error instanceof FollowUpNotOpenError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/follow-ups");
  return {};
}
