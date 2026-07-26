"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/assignLead.action.ts
//
// Server Action for assigning/reassigning a Lead's current owner. Requires
// `lead.reassign` (Team Leader+, rbac-catalog.ts).
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  assignLead,
  assignLeadSchema,
  InvalidAssigneeReferenceError,
  LeadNotFoundError,
} from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";
import type { LeadFormState } from "./createLead.action";
import { LeadAccessDeniedError, requireAccessibleLead } from "./requireLeadAccess";

export async function assignLeadAction(
  id: string,
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session, authContext } = await requirePermission("lead.reassign");

  const parsed = assignLeadSchema.safeParse({ assignedToUserId: formData.get("assignedToUserId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await requireAccessibleLead(authContext, id, {
      permissionCode: "lead.reassign",
      actorUserId: session.user.id,
    });
    await assignLead({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof LeadNotFoundError ||
      error instanceof InvalidAssigneeReferenceError ||
      error instanceof LeadAccessDeniedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  return {};
}
