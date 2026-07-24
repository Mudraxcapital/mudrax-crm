"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/createDocumentType.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createDocumentType,
  createDocumentTypeSchema,
  DocumentCategoryNotFoundError,
  DuplicateDocumentTypeNameError,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

export async function createDocumentTypeAction(
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session, authContext } = await requirePermission("document.category.manage");

  const parsed = createDocumentTypeSchema.safeParse({
    documentCategoryId: formData.get("documentCategoryId"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createDocumentType({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof DuplicateDocumentTypeNameError ||
      error instanceof DocumentCategoryNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/documents/categories");
  return {};
}
