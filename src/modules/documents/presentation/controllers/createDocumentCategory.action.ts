"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/createDocumentCategory.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createDocumentCategory,
  createDocumentCategorySchema,
  DuplicateDocumentCategoryNameError,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

export async function createDocumentCategoryAction(
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session, authContext } = await requirePermission("document.category.manage");

  const parsed = createDocumentCategorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createDocumentCategory({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateDocumentCategoryNameError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/documents/categories");
  return {};
}
