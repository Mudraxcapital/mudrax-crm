"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/updateLead.action.ts
//
// Server Action backing the Lead edit form. Requires `lead.update`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  InvalidLeadSourceReferenceError,
  LeadNotFoundError,
  updateLead,
  updateLeadSchema,
} from "@/modules/leads";
import type { LeadFormState } from "./createLead.action";

export async function updateLeadAction(
  id: string,
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session } = await requirePermission("lead.update");

  const parsed = updateLeadSchema.safeParse({
    fullNameSnapshot: formData.get("fullNameSnapshot") || undefined,
    phoneSnapshot: formData.get("phoneSnapshot") || undefined,
    emailSnapshot: formData.get("emailSnapshot") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateLead({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof LeadNotFoundError || error instanceof InvalidLeadSourceReferenceError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}
