"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/updateDocumentCategory.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  DuplicateDocumentCategoryNameError,
  DocumentCategoryNotFoundError,
  getDocumentCategory,
  updateDocumentCategory,
  updateDocumentCategorySchema,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

export async function updateDocumentCategoryAction(
  categoryId: string,
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session, authContext } = await requirePermission("document.category.manage");

  const parsed = updateDocumentCategorySchema.safeParse({
    name: formData.get("name") || undefined,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const existing = await getDocumentCategory(categoryId);
    if (existing.organizationId !== authContext.organizationId) {
      return { error: "Category not found or access denied." };
    }
    await updateDocumentCategory({
      id: categoryId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof DuplicateDocumentCategoryNameError ||
      error instanceof DocumentCategoryNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/documents/categories");
  return {};
}
