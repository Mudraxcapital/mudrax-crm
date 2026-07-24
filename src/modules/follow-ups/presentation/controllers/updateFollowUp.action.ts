"use server";

// ============================================================================
// src/modules/follow-ups/presentation/controllers/updateFollowUp.action.ts
//
// Server Action for rescheduling/editing an open Follow-up. Requires
// `follow_up.create` (the same Permission that covers scheduling).
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  FollowUpNotFoundError,
  FollowUpNotOpenError,
  updateFollowUp,
  updateFollowUpSchema,
} from "@/modules/follow-ups";
import { requirePermission } from "@/infra/auth/session";
import type { FollowUpFormState } from "./createFollowUp.action";

export async function updateFollowUpAction(
  leadId: string,
  id: string,
  _previousState: FollowUpFormState | undefined,
  formData: FormData,
): Promise<FollowUpFormState> {
  const { session } = await requirePermission("follow_up.create");

  const parsed = updateFollowUpSchema.safeParse({
    triggerType: formData.get("triggerType") || undefined,
    scheduledFor: formData.get("scheduledFor") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateFollowUp({
      id,
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
