"use server";

// ============================================================================
// src/modules/follow-ups/presentation/controllers/createFollowUp.action.ts
//
// Server Action backing the Follow-up creation form. Requires
// `follow_up.create` ("Schedule a Follow-up").
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createFollowUp,
  createFollowUpSchema,
  InvalidAssigneeReferenceError,
  InvalidLeadReferenceError,
} from "@/modules/follow-ups";
import { getLead, LeadNotFoundError } from "@/modules/leads";
import {
  assertCanAccessLead,
  LeadAccessDeniedError,
} from "@/shared/auth/assertCanAccessLead";

export interface FollowUpFormState {
  error?: string;
}

export async function createFollowUpAction(
  leadId: string,
  _previousState: FollowUpFormState | undefined,
  formData: FormData,
): Promise<FollowUpFormState> {
  const { session, authContext } = await requirePermission("follow_up.create");

  const parsed = createFollowUpSchema.safeParse({
    leadId,
    triggerType: formData.get("triggerType"),
    scheduledFor: formData.get("scheduledFor"),
    currentAssigneeUserId: formData.get("currentAssigneeUserId") || undefined,
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
    await createFollowUp({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidAssigneeReferenceError ||
      error instanceof LeadNotFoundError ||
      error instanceof LeadAccessDeniedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/caller/leads/${leadId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/calendar");
  revalidatePath("/");
  return {};
}
