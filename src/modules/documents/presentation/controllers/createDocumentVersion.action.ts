"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/createDocumentVersion.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createDocumentVersion,
  createDocumentVersionSchema,
  DocumentNotFoundError,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

export async function createDocumentVersionAction(
  documentId: string,
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session } = await requirePermission("document.upload");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "A file is required." };
  }

  const contentBase64 = await fileToBase64(file);
  const parsed = createDocumentVersionSchema.safeParse({
    fileName: formData.get("fileName") || file.name,
    mimeType: formData.get("mimeType") || file.type || "application/octet-stream",
    contentBase64,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createDocumentVersion({
      documentId,
      userId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/documents/library/${documentId}`);
  revalidatePath("/documents/library");
  return {};
}
