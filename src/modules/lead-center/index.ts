// Public API of the `lead-center` module.
//
// Lead Center stages Facebook / Google / WhatsApp inbound leads. Campaign Leads
// are created only after explicit import. Existing `leads` / `campaigns` public
// APIs remain the sole writers of Campaign Lead state.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaLeadCenterRepository } from "./infrastructure/repositories/PrismaLeadCenterRepository";
import { LeadsModuleLookupAdapter } from "./infrastructure/adapters/LeadsModuleLookupAdapter";
import { LeadsDuplicateClassificationAdapter } from "./infrastructure/adapters/LeadsDuplicateClassificationAdapter";
import {
  CampaignLookupAdapter,
  CreateCampaignLeadAdapter,
  CustomersResolveAdapter,
  LeadSourceResolveAdapter,
} from "./infrastructure/adapters/CampaignImportAdapters";
import {
  makeEnsureLeadCenterSources,
  makeIngestLeads,
} from "./application/use-cases/ingestLeads";
import {
  makeCountStagedLeads,
  makeListLeadCenterDashboard,
  makeListStagedLeads,
} from "./application/use-cases/listLeadCenter";
import {
  makeImportStagedLeadsToCampaign,
  makePreviewCampaignImport,
} from "./application/use-cases/importStagedLeadsToCampaign";
import { normalizeInboundLead, normalizeInboundLeads } from "./application/services/normalizeInboundLead";
import {
  validateNormalizedLead,
  validateNormalizedLeads,
} from "./application/services/validateNormalizedLead";

export {
  LEAD_CENTER_SOURCE_CODES,
  LEAD_CENTER_SOURCE_LABELS,
  LEAD_CENTER_IMPORT_SCOPES,
  LEAD_CENTER_IMPORT_SCOPE_LABELS,
  STAGED_LEAD_STATUSES,
  isLeadCenterSourceCode,
  isLeadCenterImportScope,
  sourceCodesForImportScope,
  type LeadCenterSourceCode,
  type LeadCenterImportScope,
  type StagedLeadStatus,
} from "./catalog";

export type { StagedLead } from "./domain/entities/StagedLead";
export type {
  StagedDuplicateStatus,
  StagedValidationStatus,
  StagedImportStatus,
} from "./domain/entities/StagedLead";
export {
  STAGED_DUPLICATE_STATUSES,
  STAGED_VALIDATION_STATUSES,
  STAGED_IMPORT_STATUSES,
} from "./domain/entities/StagedLead";
export type { IngestionBatch, LeadCenterSourceBucket } from "./domain/entities/IngestionBatch";
export { INGESTION_BATCH_STATUSES } from "./domain/entities/IngestionBatch";
export type {
  LeadCenterActorType,
  LeadCenterAuditActor,
  LeadCenterAuditRecord,
} from "./domain/entities/LeadCenterAuditRecord";
export { LEAD_CENTER_ACTOR_TYPES } from "./domain/entities/LeadCenterAuditRecord";
export {
  LeadCenterError,
  StagedLeadNotFoundError,
  IngestionBatchNotFoundError,
  InvalidLeadCenterSourceError,
  IngestionValidationError,
} from "./domain/errors/LeadCenterErrors";
export type { ListStagedLeadsFilter, SourceBucketCount } from "./domain/repositories/LeadCenterRepository";
export type { IngestLeadsResult } from "./application/use-cases/ingestLeads";
export type {
  LeadCenterBucketSummary,
  LeadCenterDashboard,
} from "./application/use-cases/listLeadCenter";
export type { RawInboundLead, NormalizedInboundLead } from "./application/services/normalizeInboundLead";
export type {
  CampaignImportAllocation,
  ImportStagedLeadsToCampaignResult,
} from "./application/use-cases/importStagedLeadsToCampaign";
export { BULK_MAX } from "./constants";

export { normalizeInboundLead, normalizeInboundLeads, validateNormalizedLead, validateNormalizedLeads };

const repository = new PrismaLeadCenterRepository(prisma);
const existingLeadLookup = new LeadsModuleLookupAdapter();
const classifyDuplicates = new LeadsDuplicateClassificationAdapter();
const customers = new CustomersResolveAdapter();
const createCampaignLead = new CreateCampaignLeadAdapter();
const leadSources = new LeadSourceResolveAdapter();
const campaigns = new CampaignLookupAdapter();

export const ensureLeadCenterSources = makeEnsureLeadCenterSources(repository);
export const ingestLeads = makeIngestLeads(repository, existingLeadLookup, classifyDuplicates);
export const listLeadCenterDashboard = makeListLeadCenterDashboard(repository);
export const listStagedLeads = makeListStagedLeads(repository);
export const countStagedLeads = makeCountStagedLeads(repository);

export const previewCampaignImport = makePreviewCampaignImport(repository);
export const importStagedLeadsToCampaign = makeImportStagedLeadsToCampaign(
  repository,
  customers,
  createCampaignLead,
  leadSources,
  campaigns,
);
