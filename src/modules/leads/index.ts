// Public API of the `leads` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaLeadRepository } from "./infrastructure/repositories/PrismaLeadRepository";
import { PrismaLeadNoteRepository } from "./infrastructure/repositories/PrismaLeadNoteRepository";
import { PrismaLeadCatalogRepository } from "./infrastructure/repositories/PrismaLeadCatalogRepository";
import { PrismaSavedViewRepository } from "./infrastructure/repositories/PrismaSavedViewRepository";
import { PrismaImportBatchRepository } from "./infrastructure/repositories/PrismaImportBatchRepository";
import { CustomersModuleLookupAdapter } from "./infrastructure/adapters/CustomersModuleLookupAdapter";
import { UsersModuleLookupAdapter } from "./infrastructure/adapters/UsersModuleLookupAdapter";
import { makeCreateLead } from "./application/use-cases/createLead";
import { makeUpdateLead } from "./application/use-cases/updateLead";
import { makeChangeLeadStage } from "./application/use-cases/changeLeadStage";
import { makeAssignLead } from "./application/use-cases/assignLead";
import {
  makeCountLeads,
  makeGetLead,
  makeListLeads,
  makeListLeadsByCustomer,
} from "./application/use-cases/getLead";
import { makeListLeadAssignmentHistory } from "./application/use-cases/listLeadAssignmentHistory";
import {
  makeListLeadAuditLog,
  makeListRecentLeadActivity,
} from "./application/use-cases/listLeadAuditLog";
import {
  makeGetLeadsByStage,
  makeGetLeadsBySource,
} from "./application/use-cases/getLeadStatistics";
import { makeAddLeadNote } from "./application/use-cases/addLeadNote";
import { makeUpdateLeadNote } from "./application/use-cases/updateLeadNote";
import { makeListLeadNotes } from "./application/use-cases/listLeadNotes";
import { makeUpdateLeadNextAction } from "./application/use-cases/updateLeadNextAction";
import {
  makeCreateSavedView,
  makeDeleteSavedView,
  makeListSavedViews,
  makeUpdateSavedView,
} from "./application/use-cases/savedViews";
import { makeExportLeadsCsv } from "./application/use-cases/exportLeadsCsv";
import {
  makeGetImportBatch,
  makeImportLeadsCsv,
  makeListImportBatches,
  makePreviewImportDuplicates,
} from "./application/use-cases/importLeadsCsv";
import {
  buildDuplicateReportCsv,
  buildFailedRowsCsv,
  classifyImportDuplicates,
  DUPLICATE_MATCH_LABELS,
  groupDuplicatesByStage,
} from "./application/use-cases/detectImportDuplicates";
import { previewLeadDistribution } from "./application/use-cases/previewLeadDistribution";
import {
  makeBulkAssignLeads,
  makeBulkChangeLeadStage,
  makeBulkCloseLeads,
} from "./application/use-cases/bulkLeadOperations";
import { makeMergeLeads } from "./application/use-cases/mergeLeads";
import { makeGetKanbanBoard } from "./application/use-cases/getKanbanBoard";
import { makeGetAssigneePortfolio } from "./application/use-cases/getAssigneePortfolio";
import { makeRepointLeadsCustomer } from "./application/use-cases/repointLeadsCustomer";
import {
  makeArchiveLeadField,
  makeCreateLeadField,
  makeHideLeadField,
  makeListActiveLeadFields,
  makeListLeadFields,
  makeReorderLeadFields,
  makeRestoreLeadField,
  makeShowLeadField,
  makeUpdateLeadField,
} from "./application/use-cases/manageLeadFields";
import { PrismaLeadFieldDefinitionRepository } from "./infrastructure/repositories/PrismaLeadFieldDefinitionRepository";

export type { Lead } from "./domain/entities/Lead";
export type { LeadAssignment, AssignmentType } from "./domain/entities/LeadAssignment";
export { ASSIGNMENT_TYPES } from "./domain/entities/LeadAssignment";
export type { LeadNote } from "./domain/entities/LeadNote";
export type {
  LeadStage,
  LeadSource,
  LostReason,
  StageBucket,
  CloseOutcome,
} from "./domain/entities/LeadCatalogs";
export { STAGE_BUCKETS, CLOSE_OUTCOMES } from "./domain/entities/LeadCatalogs";
export type {
  LeadActorType,
  LeadAuditActor,
  LeadAuditRecord,
} from "./domain/entities/LeadAuditRecord";
export { LEAD_ACTOR_TYPES } from "./domain/entities/LeadAuditRecord";
export type { SavedView, LeadFilterConfig } from "./domain/entities/SavedView";
export type { ImportBatch, ImportRow } from "./domain/entities/ImportBatch";
export {
  LeadNotFoundError,
  InvalidCustomerReferenceError,
  InvalidLeadSourceReferenceError,
  InvalidLeadStageReferenceError,
  InvalidLostReasonReferenceError,
  LostReasonRequiredError,
  LeadAlreadyClosedError,
  InvalidAssigneeReferenceError,
  LeadNoteNotFoundError,
  SavedViewNotFoundError,
  ImportBatchNotFoundError,
  LeadMergeError,
  BulkOperationError,
} from "./domain/errors/LeadErrors";
export {
  LeadFieldNotFoundError,
  LeadFieldKeyConflictError,
  LeadFieldNameConflictError,
  ProtectedLeadFieldError,
  LeadFieldValidationError,
} from "./domain/errors/LeadFieldErrors";
export type { ListLeadsFilter } from "./domain/repositories/LeadRepository";
export type { LeadDto, LeadCatalogLookups } from "./application/dto/LeadDto";
export type {
  LeadFieldDefinitionDto,
  LeadFieldValueDto,
} from "./application/dto/LeadFieldDefinitionDto";
export {
  visibleFormFields,
  importableFields,
  exportableFields,
  searchableFields,
  filterableFields,
} from "./application/dto/LeadFieldDefinitionDto";
export type { LeadAssignmentDto } from "./application/dto/LeadAssignmentDto";
export type { LeadNoteDto } from "./application/dto/LeadNoteDto";
export type { SavedViewDto } from "./application/dto/SavedViewDto";
export type { ImportBatchDto, ImportRowDto } from "./application/dto/ImportBatchDto";
export type { KanbanColumn } from "./application/use-cases/getKanbanBoard";
export type { BulkResult } from "./application/use-cases/bulkLeadOperations";
export type {
  LeadsByStageEntry,
  LeadsBySourceEntry,
} from "./application/use-cases/getLeadStatistics";
export {
  LEAD_FIELD_TYPES,
  LEAD_FIELD_GROUPS,
  LEAD_FIELD_STATUSES,
  PROTECTED_SYSTEM_KEYS,
  type LeadFieldDefinition,
  type LeadFieldType,
  type LeadFieldGroup,
  type LeadFieldStatus,
} from "./domain/entities/LeadFieldDefinition";
export {
  createLeadSchema,
  updateLeadSchema,
  changeLeadStageSchema,
  assignLeadSchema,
  createLeadNoteSchema,
  updateLeadNoteSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
  type ChangeLeadStageInput,
  type AssignLeadInput,
  type CreateLeadNoteInput,
  type UpdateLeadNoteInput,
} from "./application/validators/leadSchemas";
export {
  createLeadFieldSchema,
  updateLeadFieldSchema,
  reorderLeadFieldsSchema,
  type CreateLeadFieldInput,
  type UpdateLeadFieldInput,
  type ReorderLeadFieldsInput,
} from "./application/validators/leadFieldSchemas";
export {
  createSavedViewSchema,
  updateSavedViewSchema,
  advancedLeadSearchSchema,
  importLeadsCsvSchema,
  leadImportColumnMappingSchema,
  previewImportDuplicatesSchema,
  duplicateMatchModeSchema,
  duplicateResolutionModeSchema,
  importDistributionStrategySchema,
  bulkAssignLeadsSchema,
  bulkChangeLeadStageSchema,
  bulkCloseLeadsSchema,
  mergeLeadsSchema,
  leadFilterConfigSchema,
  type CreateSavedViewInput,
  type UpdateSavedViewInput,
  type AdvancedLeadSearchInput,
  type ImportLeadsCsvInput,
  type PreviewImportDuplicatesInput,
  type BulkAssignLeadsInput,
  type BulkChangeLeadStageInput,
  type BulkCloseLeadsInput,
  type MergeLeadsInput,
} from "./application/validators/productivitySchemas";
export type { ImportLeadsSummary } from "./application/use-cases/importLeadsCsv";
export type {
  DuplicateMatchMode,
  DuplicateResolutionMode,
  DuplicateDetectionSummary,
  DuplicateClassification,
  DuplicateStatusGroup,
} from "./application/use-cases/detectImportDuplicates";
export type {
  ImportDistributionStrategy,
  DistributionPreview,
} from "./application/use-cases/previewLeadDistribution";
export {
  buildDuplicateReportCsv,
  buildFailedRowsCsv,
  classifyImportDuplicates,
  groupDuplicatesByStage,
  DUPLICATE_MATCH_LABELS,
  previewLeadDistribution,
};
export {
  buildUnknownColumnSuggestions,
  detectFieldTypeFromSamples,
} from "./application/services/detectImportFieldType";
export type { UnknownColumnSuggestion } from "./application/services/detectImportFieldType";
export type { CreateLeadCommand } from "./application/use-cases/createLead";
export type { UpdateLeadCommand } from "./application/use-cases/updateLead";
export type { ChangeLeadStageCommand } from "./application/use-cases/changeLeadStage";
export type { AssignLeadCommand } from "./application/use-cases/assignLead";
export type { AddLeadNoteCommand } from "./application/use-cases/addLeadNote";
export type { UpdateLeadNoteCommand } from "./application/use-cases/updateLeadNote";
export type {
  AssigneePortfolioDto,
  AssigneePortfolioSummaryDto,
} from "./application/dto/AssigneePortfolioDto";
export type { AssigneePortfolioFilter } from "./application/use-cases/getAssigneePortfolio";

const leadRepository = new PrismaLeadRepository(prisma);
const leadNoteRepository = new PrismaLeadNoteRepository(prisma);
const leadCatalogRepository = new PrismaLeadCatalogRepository(prisma);
const savedViewRepository = new PrismaSavedViewRepository(prisma);
const importBatchRepository = new PrismaImportBatchRepository(prisma);
const leadFieldRepository = new PrismaLeadFieldDefinitionRepository(prisma);
const customerLookup = new CustomersModuleLookupAdapter();
const userLookup = new UsersModuleLookupAdapter();

export const createLead = makeCreateLead(
  leadRepository,
  leadCatalogRepository,
  customerLookup,
  userLookup,
  leadFieldRepository,
);
export const updateLead = makeUpdateLead(leadRepository, leadCatalogRepository, leadFieldRepository);
export const changeLeadStage = makeChangeLeadStage(leadRepository, leadCatalogRepository);
export const assignLead = makeAssignLead(leadRepository, leadCatalogRepository, userLookup);
export const getLead = makeGetLead(leadRepository, leadCatalogRepository, leadFieldRepository);
export const listLeads = makeListLeads(leadRepository, leadCatalogRepository, leadFieldRepository);
export const listLeadsByCustomer = makeListLeadsByCustomer(
  leadRepository,
  leadCatalogRepository,
  leadFieldRepository,
);
export const countLeads = makeCountLeads(leadRepository);
export const listLeadAssignmentHistory = makeListLeadAssignmentHistory(leadRepository);
export const listLeadAuditLog = makeListLeadAuditLog(leadRepository);
export const listRecentLeadActivity = makeListRecentLeadActivity(leadRepository);
export const getLeadsByStage = makeGetLeadsByStage(leadRepository, leadCatalogRepository);
export const getLeadsBySource = makeGetLeadsBySource(leadRepository, leadCatalogRepository);
export const addLeadNote = makeAddLeadNote(leadRepository, leadNoteRepository);
export const updateLeadNote = makeUpdateLeadNote(leadNoteRepository);
export const listLeadNotes = makeListLeadNotes(leadNoteRepository);
export const updateLeadNextAction = makeUpdateLeadNextAction(leadRepository);

export const listSavedViews = makeListSavedViews(savedViewRepository);
export const createSavedView = makeCreateSavedView(savedViewRepository);
export const updateSavedView = makeUpdateSavedView(savedViewRepository);
export const deleteSavedView = makeDeleteSavedView(savedViewRepository);
export const exportLeadsCsv = makeExportLeadsCsv(
  leadRepository,
  leadCatalogRepository,
  leadFieldRepository,
);
export const importLeadsCsv = makeImportLeadsCsv(
  importBatchRepository,
  leadRepository,
  leadCatalogRepository,
  customerLookup,
  userLookup,
  leadNoteRepository,
  leadFieldRepository,
);

export const listLeadFields = makeListLeadFields(leadFieldRepository);
export const listActiveLeadFields = makeListActiveLeadFields(leadFieldRepository);
export const createLeadField = makeCreateLeadField(leadFieldRepository);
export const updateLeadField = makeUpdateLeadField(leadFieldRepository);
export const hideLeadField = makeHideLeadField(leadFieldRepository);
export const showLeadField = makeShowLeadField(leadFieldRepository);
export const archiveLeadField = makeArchiveLeadField(leadFieldRepository);
export const restoreLeadField = makeRestoreLeadField(leadFieldRepository);
export const reorderLeadFields = makeReorderLeadFields(leadFieldRepository);
export const ensureLeadFieldDefaults = (organizationId: string, createdByUserId?: string | null) =>
  leadFieldRepository.ensureSystemDefaults(organizationId, createdByUserId);
export const listImportBatches = makeListImportBatches(importBatchRepository);
export const getImportBatch = makeGetImportBatch(importBatchRepository);
export const previewImportDuplicates = makePreviewImportDuplicates(
  leadRepository,
  leadCatalogRepository,
);
export const bulkAssignLeads = makeBulkAssignLeads(
  leadRepository,
  leadCatalogRepository,
  userLookup,
);
export const bulkChangeLeadStage = makeBulkChangeLeadStage(leadRepository, leadCatalogRepository);
export const bulkCloseLeads = makeBulkCloseLeads(leadRepository, leadCatalogRepository);
export const mergeLeads = makeMergeLeads(leadRepository, leadCatalogRepository);
export const getKanbanBoard = makeGetKanbanBoard(leadRepository, leadCatalogRepository);
export const getAssigneePortfolio = makeGetAssigneePortfolio(
  leadRepository,
  leadCatalogRepository,
);
export const repointLeadsCustomer = makeRepointLeadsCustomer(leadRepository);

export const leadCatalogs = {
  listStages: (organizationId: string) => leadCatalogRepository.listStages(organizationId),
  listSources: (organizationId: string) => leadCatalogRepository.listSources(organizationId),
  listLostReasons: (organizationId: string) =>
    leadCatalogRepository.listLostReasons(organizationId),
};
