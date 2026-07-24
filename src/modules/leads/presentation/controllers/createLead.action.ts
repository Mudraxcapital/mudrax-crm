"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/createLead.action.ts
//
// Server Action backing the Lead creation form. Requires `lead.create`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createLead,
  createLeadSchema,
  InvalidAssigneeReferenceError,
  InvalidCustomerReferenceError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
} from "@/modules/leads";

export interface LeadFormState {
  error?: string;
}

export type CreateLeadFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

export async function createLeadAction(
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session, authContext } = await requirePermission("lead.create");

  const parsed = createLeadSchema.safeParse({
    customerId: formData.get("customerId"),
    leadSourceId: formData.get("leadSourceId"),
    currentAssigneeUserId: formData.get("currentAssigneeUserId") || undefined,
    fullNameSnapshot: formData.get("fullNameSnapshot"),
    phoneSnapshot: formData.get("phoneSnapshot") || undefined,
    emailSnapshot: formData.get("emailSnapshot") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let leadId: string;
  try {
    const lead = await createLead({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    leadId = lead.id;
  } catch (error) {
    if (
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidLeadSourceReferenceError ||
      error instanceof InvalidLeadStageReferenceError ||
      error instanceof InvalidAssigneeReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/leads");
  redirect(`/leads/${leadId}`);
}
