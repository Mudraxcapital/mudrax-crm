// Public API of the `leads` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaLeadRepository } from "./infrastructure/repositories/PrismaLeadRepository";
import { PrismaLeadNoteRepository } from "./infrastructure/repositories/PrismaLeadNoteRepository";
import { PrismaLeadCatalogRepository } from "./infrastructure/repositories/PrismaLeadCatalogRepository";
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
} from "./domain/errors/LeadErrors";
export type { ListLeadsFilter } from "./domain/repositories/LeadRepository";
export type { LeadDto, LeadCatalogLookups } from "./application/dto/LeadDto";
export type { LeadAssignmentDto } from "./application/dto/LeadAssignmentDto";
export type { LeadNoteDto } from "./application/dto/LeadNoteDto";
export type {
  LeadsByStageEntry,
  LeadsBySourceEntry,
} from "./application/use-cases/getLeadStatistics";
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
export type { CreateLeadCommand } from "./application/use-cases/createLead";
export type { UpdateLeadCommand } from "./application/use-cases/updateLead";
export type { ChangeLeadStageCommand } from "./application/use-cases/changeLeadStage";
export type { AssignLeadCommand } from "./application/use-cases/assignLead";
export type { AddLeadNoteCommand } from "./application/use-cases/addLeadNote";
export type { UpdateLeadNoteCommand } from "./application/use-cases/updateLeadNote";

const leadRepository = new PrismaLeadRepository(prisma);
const leadNoteRepository = new PrismaLeadNoteRepository(prisma);
const leadCatalogRepository = new PrismaLeadCatalogRepository(prisma);
const customerLookup = new CustomersModuleLookupAdapter();
const userLookup = new UsersModuleLookupAdapter();

export const createLead = makeCreateLead(
  leadRepository,
  leadCatalogRepository,
  customerLookup,
  userLookup,
);
export const updateLead = makeUpdateLead(leadRepository, leadCatalogRepository);
export const changeLeadStage = makeChangeLeadStage(leadRepository, leadCatalogRepository);
export const assignLead = makeAssignLead(leadRepository, leadCatalogRepository, userLookup);
export const getLead = makeGetLead(leadRepository, leadCatalogRepository);
export const listLeads = makeListLeads(leadRepository, leadCatalogRepository);
export const listLeadsByCustomer = makeListLeadsByCustomer(leadRepository, leadCatalogRepository);
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

export const leadCatalogs = {
  listStages: (organizationId: string) => leadCatalogRepository.listStages(organizationId),
  listSources: (organizationId: string) => leadCatalogRepository.listSources(organizationId),
  listLostReasons: (organizationId: string) =>
    leadCatalogRepository.listLostReasons(organizationId),
};
