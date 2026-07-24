// Public API of the `documents` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { LocalDiskStorageAdapter } from "@/integrations/storage/local/LocalDiskStorageAdapter";
import { PrismaAttachmentRepository } from "./infrastructure/repositories/PrismaAttachmentRepository";
import { PrismaDocumentCategoryRepository } from "./infrastructure/repositories/PrismaDocumentCategoryRepository";
import { PrismaDocumentRepository } from "./infrastructure/repositories/PrismaDocumentRepository";
import { PrismaDocumentTypeRepository } from "./infrastructure/repositories/PrismaDocumentTypeRepository";
import { PrismaDocumentVerificationRepository } from "./infrastructure/repositories/PrismaDocumentVerificationRepository";
import { PrismaStorageLocationRepository } from "./infrastructure/repositories/PrismaStorageLocationRepository";
import { CustomersModuleLookupAdapter } from "./infrastructure/adapters/CustomersModuleLookupAdapter";
import { LeadsModuleLookupAdapter } from "./infrastructure/adapters/LeadsModuleLookupAdapter";

import { makeCreateDocumentCategory } from "./application/use-cases/createDocumentCategory";
import { makeUpdateDocumentCategory } from "./application/use-cases/updateDocumentCategory";
import {
  makeGetDocumentCategory,
  makeListDocumentCategories,
} from "./application/use-cases/getDocumentCategory";
import { makeCreateDocumentType } from "./application/use-cases/createDocumentType";
import { makeUpdateDocumentType } from "./application/use-cases/updateDocumentType";
import {
  makeGetDocumentType,
  makeListDocumentTypes,
} from "./application/use-cases/getDocumentType";
import { makeUploadDocument } from "./application/use-cases/uploadDocument";
import { makeCreateDocumentVersion } from "./application/use-cases/createDocumentVersion";
import {
  makeCountDocuments,
  makeGetDocument,
  makeListDocuments,
  makeListDocumentsByCustomer,
  makeListDocumentsByLead,
  makeListDocumentVersions,
} from "./application/use-cases/getDocument";
import { makeUpdateDocumentMetadata } from "./application/use-cases/updateDocumentMetadata";
import { makeGetDocumentPreview } from "./application/use-cases/getDocumentPreview";
import { makeDownloadDocument } from "./application/use-cases/downloadDocument";
import { makeUpdateVerificationStatus } from "./application/use-cases/updateVerificationStatus";
import {
  makeGetCurrentDocumentVerification,
  makeGetDocumentVerification,
  makeListPendingVerifications,
} from "./application/use-cases/getDocumentVerification";
import { makeGetDocumentsDashboard } from "./application/use-cases/getDocumentsDashboard";
import { makeListDocumentAuditLog } from "./application/use-cases/listDocumentAuditLog";

export type {
  Document,
  DocumentOwnerType,
  DocumentStatus,
  UploadableDocumentOwnerType,
} from "./domain/entities/Document";
export {
  DOCUMENT_OWNER_TYPES,
  DOCUMENT_STATUSES,
  UPLOADABLE_DOCUMENT_OWNER_TYPES,
  isUploadableDocumentOwnerType,
} from "./domain/entities/Document";
export type { DocumentCategory } from "./domain/entities/DocumentCategory";
export type { DocumentType } from "./domain/entities/DocumentType";
export type { Attachment, AttachmentStatus } from "./domain/entities/Attachment";
export { ATTACHMENT_STATUSES } from "./domain/entities/Attachment";
export type { DocumentVersion, DocumentVersionStatus } from "./domain/entities/DocumentVersion";
export { DOCUMENT_VERSION_STATUSES } from "./domain/entities/DocumentVersion";
export type {
  DocumentVerification,
  VerificationMethod,
  VerificationStatus,
} from "./domain/entities/DocumentVerification";
export {
  VERIFICATION_METHODS,
  VERIFICATION_STATUSES,
  MANUAL_VERIFICATION_STATUSES,
  TERMINAL_VERIFICATION_STATUSES,
  canTransitionVerificationStatus,
  isTerminalVerificationStatus,
} from "./domain/entities/DocumentVerification";
export type { StorageLocation, StorageProviderType } from "./domain/entities/StorageLocation";
export {
  STORAGE_PROVIDER_TYPES,
  DEFAULT_LOCAL_STORAGE_LOCATION_NAME,
} from "./domain/entities/StorageLocation";
export type {
  DocumentsActorType,
  DocumentsAuditActor,
  DocumentsAuditRecord,
} from "./domain/entities/DocumentsAuditRecord";
export { DOCUMENTS_ACTOR_TYPES } from "./domain/entities/DocumentsAuditRecord";
export {
  DocumentNotFoundError,
  DocumentCategoryNotFoundError,
  DocumentTypeNotFoundError,
  DuplicateDocumentCategoryNameError,
  DuplicateDocumentTypeNameError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  InvalidDocumentTypeReferenceError,
  InvalidDocumentOwnerError,
  MissingDocumentOwnerError,
  AttachmentNotFoundError,
  DocumentVersionNotFoundError,
  DocumentVerificationNotFoundError,
  InvalidVerificationTransitionError,
  DocumentVersionImmutableError,
  StorageLocationNotFoundError,
} from "./domain/errors/DocumentErrors";
export type { ListDocumentsFilter } from "./domain/repositories/DocumentRepository";
export type { ListDocumentTypesFilter } from "./domain/repositories/DocumentTypeRepository";

export type { DocumentCategoryDto } from "./application/dto/DocumentCategoryDto";
export type { DocumentTypeDto } from "./application/dto/DocumentTypeDto";
export type { DocumentDto, DocumentLookups } from "./application/dto/DocumentDto";
export type { DocumentVersionDto } from "./application/dto/DocumentVersionDto";
export type { DocumentVerificationDto } from "./application/dto/DocumentVerificationDto";
export type { AttachmentDto } from "./application/dto/AttachmentDto";
export type { DocumentPreviewDto } from "./application/dto/DocumentPreviewDto";
export type {
  DocumentsByCategoryDto,
  DocumentsDashboardDto,
} from "./application/dto/DocumentsDashboardDto";
export type { DownloadedDocumentFile } from "./application/use-cases/downloadDocument";

export {
  createDocumentCategorySchema,
  updateDocumentCategorySchema,
  createDocumentTypeSchema,
  updateDocumentTypeSchema,
  uploadDocumentSchema,
  createDocumentVersionSchema,
  updateDocumentMetadataSchema,
  updateVerificationStatusSchema,
  type CreateDocumentCategoryInput,
  type UpdateDocumentCategoryInput,
  type CreateDocumentTypeInput,
  type UpdateDocumentTypeInput,
  type UploadDocumentInput,
  type CreateDocumentVersionInput,
  type UpdateDocumentMetadataInput,
  type UpdateVerificationStatusInput,
} from "./application/validators/documentSchemas";

export type { CreateDocumentCategoryCommand } from "./application/use-cases/createDocumentCategory";
export type { UpdateDocumentCategoryCommand } from "./application/use-cases/updateDocumentCategory";
export type { CreateDocumentTypeCommand } from "./application/use-cases/createDocumentType";
export type { UpdateDocumentTypeCommand } from "./application/use-cases/updateDocumentType";
export type { UploadDocumentCommand } from "./application/use-cases/uploadDocument";
export type { CreateDocumentVersionCommand } from "./application/use-cases/createDocumentVersion";
export type { UpdateDocumentMetadataCommand } from "./application/use-cases/updateDocumentMetadata";
export type { UpdateVerificationStatusCommand } from "./application/use-cases/updateVerificationStatus";

const documentCategoryRepository = new PrismaDocumentCategoryRepository(prisma);
const documentTypeRepository = new PrismaDocumentTypeRepository(prisma);
const storageLocationRepository = new PrismaStorageLocationRepository(prisma);
const attachmentRepository = new PrismaAttachmentRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);
const documentVerificationRepository = new PrismaDocumentVerificationRepository(prisma);

const customerLookup = new CustomersModuleLookupAdapter();
const leadLookup = new LeadsModuleLookupAdapter();
const documentStorage = new LocalDiskStorageAdapter();

export const createDocumentCategory = makeCreateDocumentCategory(documentCategoryRepository);
export const updateDocumentCategory = makeUpdateDocumentCategory(documentCategoryRepository);
export const getDocumentCategory = makeGetDocumentCategory(documentCategoryRepository);
export const listDocumentCategories = makeListDocumentCategories(documentCategoryRepository);

export const createDocumentType = makeCreateDocumentType(
  documentTypeRepository,
  documentCategoryRepository,
);
export const updateDocumentType = makeUpdateDocumentType(
  documentTypeRepository,
  documentCategoryRepository,
);
export const getDocumentType = makeGetDocumentType(
  documentTypeRepository,
  documentCategoryRepository,
);
export const listDocumentTypes = makeListDocumentTypes(
  documentTypeRepository,
  documentCategoryRepository,
);

export const uploadDocument = makeUploadDocument(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
  storageLocationRepository,
  documentStorage,
  customerLookup,
  leadLookup,
);
export const createDocumentVersion = makeCreateDocumentVersion(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
  storageLocationRepository,
  documentStorage,
);
export const getDocument = makeGetDocument(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
);
export const listDocuments = makeListDocuments(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
);
export const listDocumentsByCustomer = makeListDocumentsByCustomer(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
);
export const listDocumentsByLead = makeListDocumentsByLead(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
);
export const listDocumentVersions = makeListDocumentVersions(documentRepository);
export const countDocuments = makeCountDocuments(documentRepository);
export const updateDocumentMetadata = makeUpdateDocumentMetadata(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
);
export const getDocumentPreview = makeGetDocumentPreview(documentRepository, attachmentRepository);
export const downloadDocument = makeDownloadDocument(
  documentRepository,
  attachmentRepository,
  documentStorage,
);
export const updateVerificationStatus = makeUpdateVerificationStatus(
  documentVerificationRepository,
  documentRepository,
);
export const getDocumentVerification = makeGetDocumentVerification(documentVerificationRepository);
export const getCurrentDocumentVerification = makeGetCurrentDocumentVerification(
  documentVerificationRepository,
  documentRepository,
);
export const listPendingVerifications = makeListPendingVerifications(
  documentVerificationRepository,
);
export const getDocumentsDashboard = makeGetDocumentsDashboard(
  documentRepository,
  documentTypeRepository,
  documentCategoryRepository,
  documentVerificationRepository,
);
export const listDocumentAuditLog = makeListDocumentAuditLog(documentRepository);
