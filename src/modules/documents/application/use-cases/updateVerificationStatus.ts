// ============================================================================
// src/modules/documents/application/use-cases/updateVerificationStatus.ts
//
// Records a reviewer's decision on one pinned Document Version and syncs
// the parent Document's workflow status to match. The Document's status is
// always derived from its current revision's verification — never set by
// hand — so "is this document verified?" has exactly one answer regardless
// of which table is asked.
//
// Terminal cycles never re-open (see DocumentVerification's transition
// table): a rejected document is corrected by uploading a new revision,
// which opens a fresh PENDING cycle of its own.
// ============================================================================

import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type { DocumentVerificationRepository } from "../../domain/repositories/DocumentVerificationRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import type { DocumentStatus } from "../../domain/entities/Document";
import {
  canTransitionVerificationStatus,
  type VerificationStatus,
} from "../../domain/entities/DocumentVerification";
import {
  DocumentNotFoundError,
  DocumentVerificationNotFoundError,
  DocumentVersionNotFoundError,
  InvalidVerificationTransitionError,
} from "../../domain/errors/DocumentErrors";
import type { UpdateVerificationStatusInput } from "../validators/documentSchemas";
import {
  toDocumentVerificationDto,
  type DocumentVerificationDto,
} from "../dto/DocumentVerificationDto";

export interface UpdateVerificationStatusCommand {
  id: string;
  userId: string;
  input: UpdateVerificationStatusInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

/** A Document mirrors its current revision's decision; anything still open or escalated leaves it simply ACTIVE. */
function documentStatusForVerification(status: VerificationStatus): DocumentStatus {
  if (status === "VERIFIED") return "VERIFIED";
  if (status === "REJECTED") return "REJECTED";
  return "ACTIVE";
}

export function makeUpdateVerificationStatus(
  repository: DocumentVerificationRepository,
  documentRepository: DocumentRepository,
) {
  return async function updateVerificationStatus(
    command: UpdateVerificationStatusCommand,
  ): Promise<DocumentVerificationDto> {
    const { id, userId, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new DocumentVerificationNotFoundError(id);
    }

    if (!canTransitionVerificationStatus(existing.status, input.status)) {
      throw new InvalidVerificationTransitionError(existing.status, input.status);
    }

    const version = await documentRepository.findVersionById(existing.documentVersionId);
    if (!version) {
      throw new DocumentVersionNotFoundError(existing.documentVersionId);
    }

    const document = await documentRepository.findById(version.documentId);
    if (!document) {
      throw new DocumentNotFoundError(version.documentId);
    }

    const isDecided = input.status !== "PENDING";
    const updated = await repository.updateStatusWithAudit(
      id,
      {
        status: input.status,
        verifiedByUserId: isDecided ? userId : null,
        verifiedAt: isDecided ? new Date() : null,
        rejectionReason: input.status === "REJECTED" ? (input.rejectionReason ?? null) : null,
      },
      actor,
      correlationId,
    );

    const nextDocumentStatus = documentStatusForVerification(updated.status);
    if (document.status !== nextDocumentStatus) {
      await documentRepository.updateMetadataWithAudit(
        document.id,
        { status: nextDocumentStatus },
        actor,
        correlationId,
      );
    }

    return toDocumentVerificationDto(updated);
  };
}
