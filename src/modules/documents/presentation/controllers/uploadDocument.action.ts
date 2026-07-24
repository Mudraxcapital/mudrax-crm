"use server";

// ============================================================================
// src/modules/documents/presentation/controllers/uploadDocument.action.ts
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  InvalidCustomerReferenceError,
  InvalidDocumentOwnerError,
  InvalidDocumentTypeReferenceError,
  InvalidLeadReferenceError,
  MissingDocumentOwnerError,
  uploadDocument,
  uploadDocumentSchema,
} from "@/modules/documents";
import type { DocumentsFormState } from "./documentsFormState";

async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

export async function uploadDocumentAction(
  _previousState: DocumentsFormState | undefined,
  formData: FormData,
): Promise<DocumentsFormState> {
  const { session, authContext } = await requirePermission("document.upload");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "A file is required." };
  }

  const contentBase64 = await fileToBase64(file);
  const parsed = uploadDocumentSchema.safeParse({
    documentTypeId: formData.get("documentTypeId"),
    ownerType: formData.get("ownerType"),
    ownerId: formData.get("ownerId"),
    fileName: formData.get("fileName") || file.name,
    mimeType: formData.get("mimeType") || file.type || "application/octet-stream",
    contentBase64,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let documentId: string;
  try {
    const document = await uploadDocument({
      organizationId: authContext.organizationId,
      userId: session.user.id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    documentId = document.id;
  } catch (error) {
    if (
      error instanceof InvalidCustomerReferenceError ||
      error instanceof InvalidLeadReferenceError ||
      error instanceof InvalidDocumentTypeReferenceError ||
      error instanceof InvalidDocumentOwnerError ||
      error instanceof MissingDocumentOwnerError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/documents");
  revalidatePath("/documents/library");
  redirect(`/documents/library/${documentId}`);
}
