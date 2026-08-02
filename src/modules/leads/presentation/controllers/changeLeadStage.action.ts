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
import { isCallerWorkspaceUser } from "@/modules/rbac";
import type { LeadFormState } from "./createLead.action";
import { LeadAccessDeniedError, requireAccessibleLead } from "./requireLeadAccess";

const FRESH_CALLER_STAGE_LOCK_MESSAGE =
  "Callers cannot change status while a lead is Fresh. Use the mobile app to call first, or ask a Team Lead, Manager, or Admin.";

export async function changeLeadStageAction(
  id: string,
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session, authContext } = await requirePermission("lead.update");

  const parsed = changeLeadStageSchema.safeParse({
    stageId: formData.get("stageId"),
    lostReasonId: formData.get("lostReasonId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const lead = await requireAccessibleLead(authContext, id, {
      permissionCode: "lead.update",
      actorUserId: session.user.id,
    });
    if (isCallerWorkspaceUser(authContext) && lead.currentStageBucket === "INITIAL") {
      return { error: FRESH_CALLER_STAGE_LOCK_MESSAGE };
    }
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
      error instanceof LostReasonRequiredError ||
      error instanceof LeadAccessDeniedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath(`/caller/leads/${id}`);
  revalidatePath("/caller/leads");
  revalidatePath("/campaigns");
  revalidatePath("/");
  return {};
}
