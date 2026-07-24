// ============================================================================
// src/modules/telephony/infrastructure/mappers/telephonyMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated CallAttempt/CallOutcome/CallNote/
// AgentSession/AgentStatusHistory/CallRecording/Extension/TelephonyAuditLog
// shapes.
// ============================================================================

import type {
  CallAttempt as PrismaCallAttempt,
  CallOutcome as PrismaCallOutcome,
  CallNote as PrismaCallNote,
  AgentSession as PrismaAgentSession,
  AgentStatusHistory as PrismaAgentStatusHistory,
  CallRecording as PrismaCallRecording,
  Extension as PrismaExtension,
  TelephonyAuditLog as PrismaTelephonyAuditLog,
} from "@prisma/client";
import type { CallAttempt } from "../../domain/entities/CallAttempt";
import type { CallOutcome } from "../../domain/entities/CallOutcome";
import type { CallNote } from "../../domain/entities/CallNote";
import type { AgentSession, AgentStatusHistory } from "../../domain/entities/AgentSession";
import type { CallRecording } from "../../domain/entities/CallRecording";
import type { Extension } from "../../domain/entities/Extension";
import type { TelephonyAuditRecord } from "../../domain/entities/TelephonyAuditRecord";

export function toCallAttempt(row: PrismaCallAttempt): CallAttempt {
  return {
    id: row.id,
    organizationId: row.organizationId,
    leadId: row.leadId,
    customerId: row.customerId,
    agentUserId: row.agentUserId,
    direction: row.direction,
    status: row.status,
    disposition: row.disposition,
    callOutcomeId: row.callOutcomeId,
    retryOfCallAttemptId: row.retryOfCallAttemptId,
    callerIdUsed: row.callerIdUsed,
    providerCallId: row.providerCallId,
    initiatedAt: row.initiatedAt,
    answeredAt: row.answeredAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCallOutcome(row: PrismaCallOutcome): CallOutcome {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCallNote(row: PrismaCallNote): CallNote {
  return {
    id: row.id,
    callAttemptId: row.callAttemptId,
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toAgentSession(row: PrismaAgentSession): AgentSession {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    extensionId: row.extensionId,
    status: row.status,
    remoteAgentContext: row.remoteAgentContext as Record<string, unknown> | null,
    loginAt: row.loginAt,
    logoutAt: row.logoutAt,
  };
}

export function toAgentStatusHistory(row: PrismaAgentStatusHistory): AgentStatusHistory {
  return {
    id: row.id,
    agentSessionId: row.agentSessionId,
    status: row.status,
    changedAt: row.changedAt,
  };
}

export function toCallRecording(row: PrismaCallRecording): CallRecording {
  return {
    id: row.id,
    callAttemptId: row.callAttemptId,
    storageReference: row.storageReference,
    durationSeconds: row.durationSeconds,
    providerMetadata: row.providerMetadata as Record<string, unknown> | null,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
  };
}

export function toExtension(row: PrismaExtension): Extension {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    extensionNumber: row.extensionNumber,
    isRemote: row.isRemote,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toTelephonyAuditRecord(row: PrismaTelephonyAuditLog): TelephonyAuditRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    occurredAt: row.occurredAt,
    actorType: row.actorType,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    beforeState: row.beforeState as Record<string, unknown> | null,
    afterState: row.afterState as Record<string, unknown> | null,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
  };
}