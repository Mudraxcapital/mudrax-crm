// Public API of the `follow-ups` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaFollowUpRepository } from "./infrastructure/repositories/PrismaFollowUpRepository";
import { LeadsModuleLookupAdapter } from "./infrastructure/adapters/LeadsModuleLookupAdapter";
import { UsersModuleLookupAdapter } from "./infrastructure/adapters/UsersModuleLookupAdapter";
import { makeCreateFollowUp } from "./application/use-cases/createFollowUp";
import { makeUpdateFollowUp } from "./application/use-cases/updateFollowUp";
import { makeCompleteFollowUp } from "./application/use-cases/completeFollowUp";
import { makeReassignFollowUp } from "./application/use-cases/reassignFollowUp";
import {
  makeCountFollowUps,
  makeGetFollowUp,
  makeListFollowUps,
  makeListFollowUpsByLead,
} from "./application/use-cases/getFollowUp";
import { makeListFollowUpReassignmentHistory } from "./application/use-cases/listFollowUpReassignmentHistory";
import {
  makeListFollowUpAuditLog,
  makeListRecentFollowUpActivity,
} from "./application/use-cases/listFollowUpAuditLog";

export type { FollowUp, FollowUpStatus, FollowUpTriggerType } from "./domain/entities/FollowUp";
export {
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_TRIGGER_TYPES,
  OPEN_FOLLOW_UP_STATUSES,
} from "./domain/entities/FollowUp";
export type { FollowUpReassignment } from "./domain/entities/FollowUpReassignment";
export type {
  FollowUpActorType,
  FollowUpAuditActor,
  FollowUpAuditRecord,
} from "./domain/entities/FollowUpAuditRecord";
export { FOLLOW_UP_ACTOR_TYPES } from "./domain/entities/FollowUpAuditRecord";
export {
  FollowUpNotFoundError,
  InvalidLeadReferenceError,
  InvalidAssigneeReferenceError,
  FollowUpNotOpenError,
} from "./domain/errors/FollowUpErrors";
export type { ListFollowUpsFilter } from "./domain/repositories/FollowUpRepository";
export type { FollowUpDto } from "./application/dto/FollowUpDto";
export type { FollowUpReassignmentDto } from "./application/dto/FollowUpReassignmentDto";
export {
  createFollowUpSchema,
  updateFollowUpSchema,
  completeFollowUpSchema,
  reassignFollowUpSchema,
  type CreateFollowUpInput,
  type UpdateFollowUpInput,
  type CompleteFollowUpInput,
  type ReassignFollowUpInput,
} from "./application/validators/followUpSchemas";
export type { CreateFollowUpCommand } from "./application/use-cases/createFollowUp";
export type { UpdateFollowUpCommand } from "./application/use-cases/updateFollowUp";
export type { CompleteFollowUpCommand } from "./application/use-cases/completeFollowUp";
export type { ReassignFollowUpCommand } from "./application/use-cases/reassignFollowUp";

const followUpRepository = new PrismaFollowUpRepository(prisma);
const leadsLookup = new LeadsModuleLookupAdapter();
const usersLookup = new UsersModuleLookupAdapter();

export const createFollowUp = makeCreateFollowUp(
  followUpRepository,
  leadsLookup,
  leadsLookup,
  usersLookup,
);
export const updateFollowUp = makeUpdateFollowUp(followUpRepository, leadsLookup);
export const completeFollowUp = makeCompleteFollowUp(followUpRepository, leadsLookup);
export const reassignFollowUp = makeReassignFollowUp(followUpRepository, usersLookup);
export const getFollowUp = makeGetFollowUp(followUpRepository);
export const listFollowUps = makeListFollowUps(followUpRepository);
export const listFollowUpsByLead = makeListFollowUpsByLead(followUpRepository);
export const countFollowUps = makeCountFollowUps(followUpRepository);
export const listFollowUpReassignmentHistory =
  makeListFollowUpReassignmentHistory(followUpRepository);
export const listFollowUpAuditLog = makeListFollowUpAuditLog(followUpRepository);
export const listRecentFollowUpActivity = makeListRecentFollowUpActivity(followUpRepository);
