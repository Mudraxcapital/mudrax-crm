"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/updateVerificationStatus.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  DocumentNotFoundError,
  DocumentVerificationNotFoundError,
  getDocument,
  InvalidVerificationTransitionError,
  updateVerificationStatus,
  updateVerificationStatusSchema,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

export async function updateVerificationStatusAction(
  verificationId: string,
  documentId: string,
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session, authContext } = await requirePermission("document.verify");

  const parsed = updateVerificationStatusSchema.safeParse({
    status: formData.get("status"),
    rejectionReason: formData.get("rejectionReason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const document = await getDocument(documentId);
    if (document.organizationId !== authContext.organizationId) {
      return { error: "Document not found or access denied." };
    }
    await updateVerificationStatus({
      id: verificationId,
      userId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof DocumentNotFoundError ||
      error instanceof DocumentVerificationNotFoundError ||
      error instanceof InvalidVerificationTransitionError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/documents/library/${documentId}`);
  revalidatePath("/documents");
  revalidatePath("/documents/library");
  return {};
}
