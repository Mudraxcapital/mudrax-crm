"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/updateDocumentType.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  DocumentCategoryNotFoundError,
  DocumentTypeNotFoundError,
  DuplicateDocumentTypeNameError,
  updateDocumentType,
  updateDocumentTypeSchema,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

export async function updateDocumentTypeAction(
  documentTypeId: string,
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session } = await requirePermission("document.category.manage");

  const parsed = updateDocumentTypeSchema.safeParse({
    documentCategoryId: formData.get("documentCategoryId") || undefined,
    name: formData.get("name") || undefined,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateDocumentType({
      id: documentTypeId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof DuplicateDocumentTypeNameError ||
      error instanceof DocumentCategoryNotFoundError ||
      error instanceof DocumentTypeNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/documents/categories");
  return {};
}
