"use server";

// ============================================================================
// src/modules/leads/presentation/controllers/updateLeadNote.action.ts
//
// Server Action for editing an existing Lead Note. Requires `lead.update`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { LeadNoteNotFoundError, updateLeadNote, updateLeadNoteSchema } from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";
import type { LeadFormState } from "./createLead.action";

export async function updateLeadNoteAction(
  leadId: string,
  noteId: string,
  _previousState: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  const { session } = await requirePermission("lead.update");

  const parsed = updateLeadNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateLeadNote({
      id: noteId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof LeadNoteNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/leads/${leadId}`);
  return {};
}
