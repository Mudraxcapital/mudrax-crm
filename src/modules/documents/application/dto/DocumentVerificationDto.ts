// ============================================================================
// src/modules/documents/application/dto/DocumentVerificationDto.ts
// ============================================================================

import type { DocumentVerification } from "../../domain/entities/DocumentVerification";

export interface DocumentVerificationDto {
  id: string;
  organizationId: string;
  documentVersionId: string;
  method: DocumentVerification["method"];
  status: DocumentVerification["status"];
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toDocumentVerificationDto(
  verification: DocumentVerification,
): DocumentVerificationDto {
  return {
    id: verification.id,
    organizationId: verification.organizationId,
    documentVersionId: verification.documentVersionId,
    method: verification.method,
    status: verification.status,
    verifiedByUserId: verification.verifiedByUserId,
    verifiedAt: verification.verifiedAt ? verification.verifiedAt.toISOString() : null,
    rejectionReason: verification.rejectionReason,
    createdAt: verification.createdAt.toISOString(),
    updatedAt: verification.updatedAt.toISOString(),
  };
}
