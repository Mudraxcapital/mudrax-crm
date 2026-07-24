// Public API of the `telephony` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { NullTelephonyProviderAdapter } from "@/integrations/telephony/null/NullTelephonyProviderAdapter";
import { PrismaCallAttemptRepository } from "./infrastructure/repositories/PrismaCallAttemptRepository";
import { PrismaCallNoteRepository } from "./infrastructure/repositories/PrismaCallNoteRepository";
import { PrismaCallOutcomeRepository } from "./infrastructure/repositories/PrismaCallOutcomeRepository";
import { PrismaAgentSessionRepository } from "./infrastructure/repositories/PrismaAgentSessionRepository";
import { PrismaCallRecordingRepository } from "./infrastructure/repositories/PrismaCallRecordingRepository";
import { PrismaExtensionRepository } from "./infrastructure/repositories/PrismaExtensionRepository";
import { LeadsModuleLookupAdapter } from "./infrastructure/adapters/LeadsModuleLookupAdapter";
import { CustomersModuleLookupAdapter } from "./infrastructure/adapters/CustomersModuleLookupAdapter";
import { UsersModuleLookupAdapter } from "./infrastructure/adapters/UsersModuleLookupAdapter";

import { makeInitiateClickToCall } from "./application/use-cases/initiateClickToCall";
import { makeUpdateCallAttemptStatus } from "./application/use-cases/updateCallAttemptStatus";
import {
  makeCountCallAttempts,
  makeGetCallAttempt,
  makeListCallAttempts,
  makeListCallHistoryByCustomer,
  makeListCallHistoryByLead,
  makeListMissedCalls,
} from "./application/use-cases/getCallAttempt";
import {
  makeListCallAttemptAuditLog,
  makeListRecentTelephonyActivity,
} from "./application/use-cases/listCallAttemptAuditLog";
import { makeAddCallNote } from "./application/use-cases/addCallNote";
import { makeUpdateCallNote } from "./application/use-cases/updateCallNote";
import { makeListCallNotes } from "./application/use-cases/listCallNotes";
import { makeCreateCallOutcome } from "./application/use-cases/createCallOutcome";
import { makeUpdateCallOutcome } from "./application/use-cases/updateCallOutcome";
import { makeGetCallOutcome, makeListCallOutcomes } from "./application/use-cases/getCallOutcome";
import { makeStartAgentSession } from "./application/use-cases/startAgentSession";
import { makeChangeAgentSessionStatus } from "./application/use-cases/changeAgentSessionStatus";
import { makeEndAgentSession } from "./application/use-cases/endAgentSession";
import {
  makeGetActiveAgentSession,
  makeGetAgentSession,
  makeListAgentSessionAuditLog,
  makeListAgentSessions,
  makeListAgentStatusHistory,
} from "./application/use-cases/getAgentSession";
import { makeCreateCallRecording } from "./application/use-cases/createCallRecording";
import { makeUpdateCallRecording } from "./application/use-cases/updateCallRecording";
import {
  makeGetCallRecording,
  makeListCallRecordings,
} from "./application/use-cases/getCallRecording";
import { makeGetTelephonyDashboard } from "./application/use-cases/getTelephonyDashboard";

export type {
  CallAttempt,
  CallDirection,
  CallStatus,
  CallDisposition,
} from "./domain/entities/CallAttempt";
export {
  CALL_DIRECTIONS,
  CALL_STATUSES,
  CALL_DISPOSITIONS,
  MISSED_CALL_STATUSES,
  TERMINAL_CALL_STATUSES,
  isMissedCallStatus,
  isTerminalCallStatus,
} from "./domain/entities/CallAttempt";
export { canTransitionCallStatus } from "./domain/entities/CallLifecycle";
export type { CallNote } from "./domain/entities/CallNote";
export type { CallOutcome } from "./domain/entities/CallOutcome";
export type {
  AgentSession,
  AgentSessionStatus,
  AgentStatusHistory,
} from "./domain/entities/AgentSession";
export {
  AGENT_SESSION_STATUSES,
  MANUAL_AGENT_SESSION_STATUSES,
} from "./domain/entities/AgentSession";
export type { CallRecording } from "./domain/entities/CallRecording";
export type { Extension } from "./domain/entities/Extension";
export type {
  TelephonyActorType,
  TelephonyAuditActor,
  TelephonyAuditRecord,
} from "./domain/entities/TelephonyAuditRecord";
export { TELEPHONY_ACTOR_TYPES } from "./domain/entities/TelephonyAuditRecord";
export {
  CallAttemptNotFoundError,
  MissingCallSubjectError,
  InvalidLeadReferenceError,
  InvalidCustomerReferenceError,
  InvalidAgentReferenceError,
  InvalidCallOutcomeReferenceError,
  InvalidCallStatusTransitionError,
  CallNoteNotFoundError,
  CallOutcomeNotFoundError,
  DuplicateCallOutcomeNameError,
  AgentSessionNotFoundError,
  AgentSessionAlreadyActiveError,
  AgentSessionAlreadyEndedError,
  CallRecordingNotFoundError,
} from "./domain/errors/TelephonyErrors";
export type { ListCallAttemptsFilter } from "./domain/repositories/CallAttemptRepository";
export type { ListAgentSessionsFilter } from "./domain/repositories/AgentSessionRepository";

export type { CallAttemptDto, CallOutcomeLookups } from "./application/dto/CallAttemptDto";
export type { CallNoteDto } from "./application/dto/CallNoteDto";
export type { CallOutcomeDto } from "./application/dto/CallOutcomeDto";
export type { AgentSessionDto, AgentStatusHistoryDto } from "./application/dto/AgentSessionDto";
export type { CallRecordingDto } from "./application/dto/CallRecordingDto";
export type {
  CallsByAgentDto,
  TelephonyDashboardDto,
} from "./application/dto/TelephonyDashboardDto";

export {
  initiateClickToCallSchema,
  updateCallAttemptStatusSchema,
  createCallOutcomeSchema,
  updateCallOutcomeSchema,
  createCallNoteSchema,
  updateCallNoteSchema,
  startAgentSessionSchema,
  changeAgentSessionStatusSchema,
  createCallRecordingSchema,
  updateCallRecordingSchema,
  type InitiateClickToCallInput,
  type UpdateCallAttemptStatusInput,
  type CreateCallOutcomeInput,
  type UpdateCallOutcomeInput,
  type CreateCallNoteInput,
  type UpdateCallNoteInput,
  type StartAgentSessionInput,
  type ChangeAgentSessionStatusInput,
  type CreateCallRecordingInput,
  type UpdateCallRecordingInput,
} from "./application/validators/telephonySchemas";

export type { InitiateClickToCallCommand } from "./application/use-cases/initiateClickToCall";
export type { UpdateCallAttemptStatusCommand } from "./application/use-cases/updateCallAttemptStatus";
export type { AddCallNoteCommand } from "./application/use-cases/addCallNote";
export type { UpdateCallNoteCommand } from "./application/use-cases/updateCallNote";
export type { CreateCallOutcomeCommand } from "./application/use-cases/createCallOutcome";
export type { UpdateCallOutcomeCommand } from "./application/use-cases/updateCallOutcome";
export type { StartAgentSessionCommand } from "./application/use-cases/startAgentSession";
export type { ChangeAgentSessionStatusCommand } from "./application/use-cases/changeAgentSessionStatus";
export type { EndAgentSessionCommand } from "./application/use-cases/endAgentSession";
export type { CreateCallRecordingCommand } from "./application/use-cases/createCallRecording";
export type { UpdateCallRecordingCommand } from "./application/use-cases/updateCallRecording";

const callAttemptRepository = new PrismaCallAttemptRepository(prisma);
const callNoteRepository = new PrismaCallNoteRepository(prisma);
const callOutcomeRepository = new PrismaCallOutcomeRepository(prisma);
const agentSessionRepository = new PrismaAgentSessionRepository(prisma);
const callRecordingRepository = new PrismaCallRecordingRepository(prisma);
const extensionRepository = new PrismaExtensionRepository(prisma);

const leadLookup = new LeadsModuleLookupAdapter();
const customerLookup = new CustomersModuleLookupAdapter();
const userLookup = new UsersModuleLookupAdapter();
const telephonyProvider = new NullTelephonyProviderAdapter();

export const initiateClickToCall = makeInitiateClickToCall(
  callAttemptRepository,
  callOutcomeRepository,
  leadLookup,
  customerLookup,
  userLookup,
  telephonyProvider,
);
export const updateCallAttemptStatus = makeUpdateCallAttemptStatus(
  callAttemptRepository,
  callOutcomeRepository,
);
export const getCallAttempt = makeGetCallAttempt(callAttemptRepository, callOutcomeRepository);
export const listCallAttempts = makeListCallAttempts(callAttemptRepository, callOutcomeRepository);
export const listMissedCalls = makeListMissedCalls(callAttemptRepository, callOutcomeRepository);
export const listCallHistoryByLead = makeListCallHistoryByLead(
  callAttemptRepository,
  callOutcomeRepository,
);
export const listCallHistoryByCustomer = makeListCallHistoryByCustomer(
  callAttemptRepository,
  callOutcomeRepository,
);
export const countCallAttempts = makeCountCallAttempts(callAttemptRepository);
export const listCallAttemptAuditLog = makeListCallAttemptAuditLog(callAttemptRepository);
export const listRecentTelephonyActivity = makeListRecentTelephonyActivity(callAttemptRepository);

export const addCallNote = makeAddCallNote(callAttemptRepository, callNoteRepository);
export const updateCallNote = makeUpdateCallNote(callNoteRepository);
export const listCallNotes = makeListCallNotes(callNoteRepository);

export const createCallOutcome = makeCreateCallOutcome(callOutcomeRepository);
export const updateCallOutcome = makeUpdateCallOutcome(callOutcomeRepository);
export const getCallOutcome = makeGetCallOutcome(callOutcomeRepository);
export const listCallOutcomes = makeListCallOutcomes(callOutcomeRepository);

export const startAgentSession = makeStartAgentSession(
  agentSessionRepository,
  extensionRepository,
  userLookup,
);
export const changeAgentSessionStatus = makeChangeAgentSessionStatus(agentSessionRepository);
export const endAgentSession = makeEndAgentSession(agentSessionRepository);
export const getAgentSession = makeGetAgentSession(agentSessionRepository);
export const getActiveAgentSession = makeGetActiveAgentSession(agentSessionRepository);
export const listAgentSessions = makeListAgentSessions(agentSessionRepository);
export const listAgentStatusHistory = makeListAgentStatusHistory(agentSessionRepository);
export const listAgentSessionAuditLog = makeListAgentSessionAuditLog(agentSessionRepository);

export const createCallRecording = makeCreateCallRecording(
  callAttemptRepository,
  callRecordingRepository,
);
export const updateCallRecording = makeUpdateCallRecording(callRecordingRepository);
export const getCallRecording = makeGetCallRecording(callRecordingRepository);
export const listCallRecordings = makeListCallRecordings(callRecordingRepository);

export const getTelephonyDashboard = makeGetTelephonyDashboard(
  callAttemptRepository,
  callOutcomeRepository,
  userLookup,
);
