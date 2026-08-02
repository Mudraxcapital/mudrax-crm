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
  LeadFieldValidationError,
  LeadNotFoundError,
  listActiveLeadFields,
  updateLead,
  updateLeadSchema,
} from "@/modules/leads";
import type { LeadFormState } from "./createLead.action";
import { extractFieldValuesFromFormData } from "../lib/extractFieldValuesFromFormData";
import { LeadAccessDeniedError, requireAccessibleLead } from "./requireLeadAccess";

export async function updateLeadAction(
  id: string,
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session, authContext } = await requirePermission("lead.update");

  try {
    await requireAccessibleLead(authContext, id, {
      permissionCode: "lead.update",
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof LeadAccessDeniedError) {
      return { error: error.message };
    }
    throw error;
  }

  const fieldValues = extractFieldValuesFromFormData(formData);
  const activeFields = await listActiveLeadFields(authContext.organizationId);
  for (const field of activeFields) {
    if (
      (field.fieldType === "BOOLEAN" || field.fieldType === "CHECKBOX") &&
      fieldValues[field.internalKey] === undefined
    ) {
      fieldValues[field.internalKey] = "false";
    }
  }
  const parsed = updateLeadSchema.safeParse({
    fieldValues,
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
    if (
      error instanceof LeadNotFoundError ||
      error instanceof InvalidLeadSourceReferenceError ||
      error instanceof LeadFieldValidationError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}
