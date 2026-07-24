// ============================================================================
// src/modules/documents/application/use-cases/uploadDocument.ts
//
// The Document upload write path. Validates the polymorphic owner against
// the module that actually owns it (ADR 0001: Prisma cannot express a
// conditional foreign key, so referential integrity for `ownerId` is an
// application-layer obligation), validates the classifying Document Type
// against the same Organization, writes the bytes through the configured
// IStorageProvider, then creates Attachment + Document + Version 1 with its
// Audit Record in a single transaction.
//
// Every upload opens a PENDING MANUAL verification pinned to the Version it
// created — a document that nobody has been asked to check is invisible
// work, and pinning it means a later re-upload cannot silently inherit this
// decision.
// ============================================================================

import type { DocumentCategoryRepository } from "../../domain/repositories/DocumentCategoryRepository";
import type { DocumentRepository } from "../../domain/repositories/DocumentRepository";
import type { DocumentTypeRepository } from "../../domain/repositories/DocumentTypeRepository";
import type { DocumentVerificationRepository } from "../../domain/repositories/DocumentVerificationRepository";
import type { StorageLocationRepository } from "../../domain/repositories/StorageLocationRepository";
import type { DocumentsAuditActor } from "../../domain/entities/DocumentsAuditRecord";
import { isUploadableDocumentOwnerType } from "../../domain/entities/Document";
import {
  InvalidCustomerReferenceError,
  InvalidDocumentOwnerError,
  InvalidDocumentTypeReferenceError,
  InvalidLeadReferenceError,
  MissingDocumentOwnerError,
} from "../../domain/errors/DocumentErrors";
import type { CustomerLookupPort } from "../ports/CustomerLookupPort";
import type { DocumentStoragePort } from "../ports/DocumentStoragePort";
import type { LeadLookupPort } from "../ports/LeadLookupPort";
import type { UploadDocumentInput } from "../validators/documentSchemas";
import { toDocumentDto, type DocumentDto } from "../dto/DocumentDto";
import { loadDocumentCatalogLookups } from "./documentLookups";
import { storeDocumentFile } from "./storeDocumentFile";

export interface UploadDocumentCommand {
  organizationId: string;
  userId: string;
  input: UploadDocumentInput;
  actor: DocumentsAuditActor;
  correlationId?: string | null;
}

export function makeUploadDocument(
  repository: DocumentRepository,
  documentTypeRepository: DocumentTypeRepository,
  documentCategoryRepository: DocumentCategoryRepository,
  verificationRepository: DocumentVerificationRepository,
  storageLocationRepository: StorageLocationRepository,
  storage: DocumentStoragePort,
  customerLookup: CustomerLookupPort,
  leadLookup: LeadLookupPort,
) {
  return async function uploadDocument(command: UploadDocumentCommand): Promise<DocumentDto> {
    const { organizationId, userId, input, actor, correlationId } = command;

    if (!input.ownerId) {
      throw new MissingDocumentOwnerError();
    }
    if (!isUploadableDocumentOwnerType(input.ownerType)) {
      throw new InvalidDocumentOwnerError(input.ownerType);
    }

    if (input.ownerType === "CUSTOMER") {
      const customer = await customerLookup.findById(input.ownerId);
      if (!customer || customer.organizationId !== organizationId) {
        throw new InvalidCustomerReferenceError(input.ownerId);
      }
    } else {
      const lead = await leadLookup.findById(input.ownerId);
      if (!lead || lead.organizationId !== organizationId) {
        throw new InvalidLeadReferenceError(input.ownerId);
      }
    }

    const documentType = await documentTypeRepository.findById(input.documentTypeId);
    if (!documentType || documentType.organizationId !== organizationId) {
      throw new InvalidDocumentTypeReferenceError(input.documentTypeId);
    }

    const storageLocation = await storageLocationRepository.getOrCreateDefaultLocal(organizationId);
    const attachment = await storeDocumentFile(storage, storageLocation, {
      organizationId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      contentBase64: input.contentBase64,
    });

    const { document, currentVersion } = await repository.createUploadWithAudit(
      {
        organizationId,
        documentTypeId: input.documentTypeId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        createdByUserId: userId,
        uploadedByUserId: userId,
        attachment,
      },
      actor,
      correlationId,
    );

    const verification = await verificationRepository.createWithAudit(
      { organizationId, documentVersionId: currentVersion.id, method: "MANUAL" },
      actor,
      correlationId,
    );

    const catalogs = await loadDocumentCatalogLookups(
      documentTypeRepository,
      documentCategoryRepository,
      organizationId,
    );

    return toDocumentDto(document, {
      ...catalogs,
      currentVersionByDocumentId: new Map([[document.id, currentVersion]]),
      latestVerificationByDocumentVersionId: new Map([[currentVersion.id, verification]]),
    });
  };
}
