"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/updateDocumentMetadata.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  DocumentNotFoundError,
  InvalidDocumentTypeReferenceError,
  updateDocumentMetadata,
  updateDocumentMetadataSchema,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

export async function updateDocumentMetadataAction(
  documentId: string,
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session } = await requirePermission("document.upload");

  const parsed = updateDocumentMetadataSchema.safeParse({
    documentTypeId: formData.get("documentTypeId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateDocumentMetadata({
      id: documentId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof DocumentNotFoundError ||
      error instanceof InvalidDocumentTypeReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/documents/library/${documentId}`);
  revalidatePath("/documents/library");
  return {};
}
