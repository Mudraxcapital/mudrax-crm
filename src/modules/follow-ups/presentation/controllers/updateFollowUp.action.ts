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
import { getLead, LeadNotFoundError } from "@/modules/leads";
import {
  assertCanAccessLead,
  LeadAccessDeniedError,
} from "@/shared/auth/assertCanAccessLead";
import type { FollowUpFormState } from "./createFollowUp.action";

export async function updateFollowUpAction(
  leadId: string,
  id: string,
  _previousState: FollowUpFormState | undefined,
  formData: FormData,
): Promise<FollowUpFormState> {
  const { session, authContext } = await requirePermission("follow_up.create");

  const parsed = updateFollowUpSchema.safeParse({
    triggerType: formData.get("triggerType") || undefined,
    scheduledFor: formData.get("scheduledFor") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const lead = await getLead(leadId);
    assertCanAccessLead(authContext, lead, {
      permissionCode: "lead.view",
      actorUserId: session.user.id,
    });
    await updateFollowUp({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof FollowUpNotFoundError ||
      error instanceof FollowUpNotOpenError ||
      error instanceof LeadNotFoundError ||
      error instanceof LeadAccessDeniedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/calendar");
  return {};
}
