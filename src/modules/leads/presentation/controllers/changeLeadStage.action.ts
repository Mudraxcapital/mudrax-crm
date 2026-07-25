"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/changeLeadStage.action.ts
//
// Server Action for moving a Lead to another pipeline Stage. Requires
// `lead.update`.
// ============================================================================

import { revalidatePath } from "next/cache";
import {
  changeLeadStage,
  changeLeadStageSchema,
  InvalidLeadStageReferenceError,
  InvalidLostReasonReferenceError,
  LeadAlreadyClosedError,
  LeadNotFoundError,
  LostReasonRequiredError,
} from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";
import type { LeadFormState } from "./createLead.action";

export async function changeLeadStageAction(
  id: string,
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session } = await requirePermission("lead.update");

  const parsed = changeLeadStageSchema.safeParse({
    stageId: formData.get("stageId"),
    lostReasonId: formData.get("lostReasonId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await changeLeadStage({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof LeadNotFoundError ||
      error instanceof InvalidLeadStageReferenceError ||
      error instanceof InvalidLostReasonReferenceError ||
      error instanceof LeadAlreadyClosedError ||
      error instanceof LostReasonRequiredError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath(`/caller/leads/${id}`);
  revalidatePath("/caller/leads");
  revalidatePath("/");
  return {};
}
