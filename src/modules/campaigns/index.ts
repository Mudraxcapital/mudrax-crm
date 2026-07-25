// Public API of the `campaigns` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaCampaignRepository } from "./infrastructure/repositories/PrismaCampaignRepository";
import { UsersModuleLookupAdapter } from "./infrastructure/adapters/UsersModuleLookupAdapter";
import { LeadsModuleLookupAdapter } from "./infrastructure/adapters/LeadsModuleLookupAdapter";
import { makeCreateCampaign } from "./application/use-cases/createCampaign";
import { makeUpdateCampaign } from "./application/use-cases/updateCampaign";
import { makeChangeCampaignStatus } from "./application/use-cases/changeCampaignStatus";
import {
  makeAddCampaignMember,
  makeListCampaignMembers,
  makeRemoveCampaignMember,
} from "./application/use-cases/manageCampaignMembership";
import { makeAssignCampaignLeads } from "./application/use-cases/assignCampaignLeads";
import { makeRedistributeCampaignLeads } from "./application/use-cases/redistributeCampaignLeads";
import {
  makeCountCampaigns,
  makeGetCampaign,
  makeListCampaigns,
  makeListCampaignsForMember,
} from "./application/use-cases/getCampaign";
import { makeGetCampaignStatistics } from "./application/use-cases/getCampaignStatistics";
import {
  makeListCampaignAuditLog,
  makeListRecentCampaignActivity,
} from "./application/use-cases/listCampaignAuditLog";

export type { Campaign, CampaignStatus } from "./domain/entities/Campaign";
export { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_TRANSITIONS } from "./domain/entities/Campaign";
export type { CampaignMembership } from "./domain/entities/CampaignMembership";
export type {
  AllocationMethod,
  CampaignAssignment,
  CampaignAssignmentAllocation,
  CampaignAssignmentStatus,
} from "./domain/entities/CampaignAssignment";
export {
  ALLOCATION_METHODS,
  CAMPAIGN_ASSIGNMENT_STATUSES,
} from "./domain/entities/CampaignAssignment";
export type {
  CampaignActorType,
  CampaignAuditActor,
  CampaignAuditRecord,
} from "./domain/entities/CampaignAuditRecord";
export { CAMPAIGN_ACTOR_TYPES } from "./domain/entities/CampaignAuditRecord";
export {
  CampaignNotFoundError,
  InvalidCampaignStatusTransitionError,
  InvalidMemberReferenceError,
  CampaignMembershipNotFoundError,
  NoActiveMembersError,
  InvalidAllocationError,
  InvalidLeadReferenceError,
} from "./domain/errors/CampaignErrors";
export type { CampaignDto } from "./application/dto/CampaignDto";
export type { CampaignMembershipDto } from "./application/dto/CampaignMembershipDto";
export type {
  CampaignAssignmentDto,
  CampaignAssignmentAllocationDto,
} from "./application/dto/CampaignAssignmentDto";
export type { CampaignStatistics } from "./application/use-cases/getCampaignStatistics";
export {
  createCampaignSchema,
  updateCampaignSchema,
  changeCampaignStatusSchema,
  addCampaignMemberSchema,
  assignCampaignLeadsSchema,
  type CreateCampaignInput,
  type UpdateCampaignInput,
  type ChangeCampaignStatusInput,
  type AddCampaignMemberInput,
  type AssignCampaignLeadsInput,
} from "./application/validators/campaignSchemas";
export type { CreateCampaignCommand } from "./application/use-cases/createCampaign";
export type { UpdateCampaignCommand } from "./application/use-cases/updateCampaign";
export type { ChangeCampaignStatusCommand } from "./application/use-cases/changeCampaignStatus";
export type {
  AddCampaignMemberCommand,
  RemoveCampaignMemberCommand,
} from "./application/use-cases/manageCampaignMembership";
export type { AssignCampaignLeadsCommand } from "./application/use-cases/assignCampaignLeads";
export type { RedistributeCampaignLeadsCommand } from "./application/use-cases/redistributeCampaignLeads";
export { parseCampaignDistributionMethod } from "./application/use-cases/redistributeCampaignLeads";

const campaignRepository = new PrismaCampaignRepository(prisma);
const usersLookup = new UsersModuleLookupAdapter();
const leadsLookup = new LeadsModuleLookupAdapter();

export const createCampaign = makeCreateCampaign(campaignRepository);
export const updateCampaign = makeUpdateCampaign(campaignRepository);
export const changeCampaignStatus = makeChangeCampaignStatus(campaignRepository);
export const addCampaignMember = makeAddCampaignMember(
  campaignRepository,
  usersLookup,
  leadsLookup,
);
export const removeCampaignMember = makeRemoveCampaignMember(campaignRepository, leadsLookup);
export const listCampaignMembers = makeListCampaignMembers(campaignRepository);
export const assignCampaignLeads = makeAssignCampaignLeads(campaignRepository, leadsLookup);
export const redistributeCampaignLeads = makeRedistributeCampaignLeads(
  campaignRepository,
  leadsLookup,
);
export const getCampaign = makeGetCampaign(campaignRepository);
export const listCampaigns = makeListCampaigns(campaignRepository);
export const listCampaignsForMember = makeListCampaignsForMember(campaignRepository);
export const countCampaigns = makeCountCampaigns(campaignRepository);
export const getCampaignStatistics = makeGetCampaignStatistics(campaignRepository);
export const listCampaignAuditLog = makeListCampaignAuditLog(campaignRepository);
export const listRecentCampaignActivity = makeListRecentCampaignActivity(campaignRepository);
