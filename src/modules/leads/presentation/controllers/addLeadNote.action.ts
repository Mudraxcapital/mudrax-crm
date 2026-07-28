"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/addLeadNote.action.ts
//
// Server Action for adding a Note to a Lead. Requires `lead.update` (Notes
// are a Lead-scoped capability, gated by the same permission as Lead edits —
// leads.md: "adds optional Notes" is part of a Caller working their own
// portfolio).
// ============================================================================

import { revalidatePath } from "next/cache";
import { addLeadNote, createLeadNoteSchema, LeadNotFoundError } from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";
import type { LeadFormState } from "./createLead.action";
import { LeadAccessDeniedError, requireAccessibleLead } from "./requireLeadAccess";

export async function addLeadNoteAction(
  leadId: string,
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session, authContext } = await requirePermission("lead.update");

  const parsed = createLeadNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await requireAccessibleLead(authContext, leadId, {
      permissionCode: "lead.update",
      actorUserId: session.user.id,
    });
    await addLeadNote({
      leadId,
      authorUserId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof LeadNotFoundError || error instanceof LeadAccessDeniedError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/caller/leads/${leadId}`);
  revalidatePath("/campaigns");
  return {};
}
