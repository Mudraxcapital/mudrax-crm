// ============================================================================
// src/modules/documents/application/validators/documentSchemas.ts
//
// Input validation for the documents module's Server Actions/API Route
// Handlers. Field limits mirror prisma/models/documents.prisma's column
// constraints. `organizationId` is deliberately never part of these schemas
// — it comes from the authenticated session, never from the client (see
// leads' leadSchemas.ts's identical convention).
//
// File bytes arrive base64-encoded rather than as multipart form data: the
// same schema then validates a Server Action call and an API Route Handler
// call without either path having to parse a multipart body, and callers
// holding a `File` encode it once at the edge.
// ============================================================================

import { z } from "zod";
import { UPLOADABLE_DOCUMENT_OWNER_TYPES } from "../../domain/entities/Document";
import { VERIFICATION_STATUSES } from "../../domain/entities/DocumentVerification";

/** Matches Postgres's own `uuid` column acceptance rule — see leads' leadSchemas.ts's identical comment. */
const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const createDocumentCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
  isActive: z.boolean().optional(),
});

export const updateDocumentCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long.").optional(),
  isActive: z.boolean().optional(),
});

export const createDocumentTypeSchema = z.object({
  documentCategoryId: uuidSchema,
  name: z.string().trim().min(1, "Name is required.").max(150, "Name is too long."),
  isActive: z.boolean().optional(),
});

export const updateDocumentTypeSchema = z.object({
  documentCategoryId: uuidSchema.optional(),
  name: z.string().trim().min(1, "Name is required.").max(150, "Name is too long.").optional(),
  isActive: z.boolean().optional(),
});

export const uploadDocumentSchema = z.object({
  documentTypeId: uuidSchema,
  ownerType: z.enum(UPLOADABLE_DOCUMENT_OWNER_TYPES),
  ownerId: uuidSchema,
  fileName: z.string().trim().min(1, "A file name is required.").max(255, "File name is too long."),
  mimeType: z.string().trim().min(1, "A file type is required.").max(150, "File type is too long."),
  contentBase64: z.string().min(1, "File content is required."),
});

export const createDocumentVersionSchema = z.object({
  fileName: z.string().trim().min(1, "A file name is required.").max(255, "File name is too long."),
  mimeType: z.string().trim().min(1, "A file type is required.").max(150, "File type is too long."),
  contentBase64: z.string().min(1, "File content is required."),
});

export const updateDocumentMetadataSchema = z.object({
  documentTypeId: uuidSchema.optional(),
});

export const updateVerificationStatusSchema = z
  .object({
    status: z.enum(VERIFICATION_STATUSES),
    rejectionReason: z.string().trim().max(2000, "Rejection reason is too long.").optional(),
  })
  .refine((data) => data.status !== "REJECTED" || Boolean(data.rejectionReason), {
    message: "A reason is required when rejecting a document.",
    path: ["rejectionReason"],
  });

export type CreateDocumentCategoryInput = z.infer<typeof createDocumentCategorySchema>;
export type UpdateDocumentCategoryInput = z.infer<typeof updateDocumentCategorySchema>;
export type CreateDocumentTypeInput = z.infer<typeof createDocumentTypeSchema>;
export type UpdateDocumentTypeInput = z.infer<typeof updateDocumentTypeSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type CreateDocumentVersionInput = z.infer<typeof createDocumentVersionSchema>;
export type UpdateDocumentMetadataInput = z.infer<typeof updateDocumentMetadataSchema>;
export type UpdateVerificationStatusInput = z.infer<typeof updateVerificationStatusSchema>;
