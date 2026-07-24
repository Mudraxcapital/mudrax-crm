// ============================================================================
// src/modules/telephony/infrastructure/repositories/PrismaAgentSessionRepository.ts
//
// Every status transition appends an AgentStatusHistory row rather than
// only overwriting AgentSession.status (docs/modules/telephony.md — "Agent
// sessions should record login/logout and availability"), plus an Audit
// Record, all in one `$transaction`.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AgentSessionRepository,
  ListAgentSessionsFilter,
  StartAgentSessionData,
} from "../../domain/repositories/AgentSessionRepository";
import type {
  AgentSession,
  AgentSessionStatus,
  AgentStatusHistory,
} from "../../domain/entities/AgentSession";
import type {
  TelephonyAuditActor,
  TelephonyAuditRecord,
} from "../../domain/entities/TelephonyAuditRecord";
import {
  toAgentSession,
  toAgentStatusHistory,
  toTelephonyAuditRecord,
} from "../mappers/telephonyMapper";

const TARGET_TYPE_AGENT_SESSION = "AgentSession";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(session: AgentSession): Prisma.InputJsonValue {
  return {
    id: session.id,
    organizationId: session.organizationId,
    userId: session.userId,
    extensionId: session.extensionId,
    status: session.status,
    loginAt: session.loginAt.toISOString(),
    logoutAt: session.logoutAt ? session.logoutAt.toISOString() : null,
  };
}

export class PrismaAgentSessionRepository implements AgentSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AgentSession | null> {
    const row = await this.prisma.agentSession.findUnique({ where: { id } });
    return row ? toAgentSession(row) : null;
  }

  async findActiveByUserId(userId: string): Promise<AgentSession | null> {
    const row = await this.prisma.agentSession.findFirst({
      where: { userId, status: { not: "LOGGED_OUT" } },
      orderBy: { loginAt: "desc" },
    });
    return row ? toAgentSession(row) : null;
  }

  async list(organizationId: string, filter?: ListAgentSessionsFilter): Promise<AgentSession[]> {
    const where: Prisma.AgentSessionWhereInput = { organizationId };
    if (filter?.userId) where.userId = filter.userId;
    if (filter?.activeOnly) where.status = { not: "LOGGED_OUT" };

    const rows = await this.prisma.agentSession.findMany({
      where,
      orderBy: { loginAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toAgentSession);
  }

  async startWithAudit(
    data: StartAgentSessionData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.agentSession.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          extensionId: data.extensionId,
          status: "LOGGED_IN",
          remoteAgentContext: (data.remoteAgentContext ?? undefined) as Prisma.InputJsonValue,
        },
      });
      const session = toAgentSession(row);

      await tx.agentStatusHistory.create({
        data: { agentSessionId: session.id, status: "LOGGED_IN" },
      });

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: session.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "AgentSessionStarted",
          targetType: TARGET_TYPE_AGENT_SESSION,
          targetId: session.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(session),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return session;
    });
  }

  async changeStatusWithAudit(
    id: string,
    status: AgentSessionStatus,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.agentSession.findUniqueOrThrow({ where: { id } });
      const before = toAgentSession(beforeRow);

      const afterRow = await tx.agentSession.update({ where: { id }, data: { status } });
      const after = toAgentSession(afterRow);

      await tx.agentStatusHistory.create({ data: { agentSessionId: after.id, status } });

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "AgentSessionStatusChanged",
          targetType: TARGET_TYPE_AGENT_SESSION,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async endWithAudit(
    id: string,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<AgentSession> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.agentSession.findUniqueOrThrow({ where: { id } });
      const before = toAgentSession(beforeRow);

      const afterRow = await tx.agentSession.update({
        where: { id },
        data: { status: "LOGGED_OUT", logoutAt: new Date() },
      });
      const after = toAgentSession(afterRow);

      await tx.agentStatusHistory.create({
        data: { agentSessionId: after.id, status: "LOGGED_OUT" },
      });

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "AgentSessionEnded",
          targetType: TARGET_TYPE_AGENT_SESSION,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toAuditJson(before),
          afterState: toAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async listStatusHistory(agentSessionId: string): Promise<AgentStatusHistory[]> {
    const rows = await this.prisma.agentStatusHistory.findMany({
      where: { agentSessionId },
      orderBy: { changedAt: "desc" },
    });
    return rows.map(toAgentStatusHistory);
  }

  async listAuditLog(agentSessionId: string): Promise<TelephonyAuditRecord[]> {
    const rows = await this.prisma.telephonyAuditLog.findMany({
      where: { targetType: TARGET_TYPE_AGENT_SESSION, targetId: agentSessionId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toTelephonyAuditRecord);
  }
}
