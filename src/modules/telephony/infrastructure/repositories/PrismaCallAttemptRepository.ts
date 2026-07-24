// ============================================================================
// src/modules/telephony/infrastructure/repositories/PrismaCallAttemptRepository.ts
//
// Prisma-backed implementation of CallAttemptRepository. Every write method
// wraps the Call Attempt row plus its Audit Record in one `$transaction`.
// Audit Records live in `telephony.telephony_audit_log`, distinguished by
// `targetType = "CallAttempt"` — see leads' PrismaLeadRepository.ts's
// identical pattern.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CallAttemptRepository,
  CallsByAgentEntry,
  CreateCallAttemptData,
  ListCallAttemptsFilter,
  UpdateCallStatusData,
} from "../../domain/repositories/CallAttemptRepository";
import type { CallAttempt } from "../../domain/entities/CallAttempt";
import { MISSED_CALL_STATUSES } from "../../domain/entities/CallAttempt";
import type { TelephonyAuditActor, TelephonyAuditRecord } from "../../domain/entities/TelephonyAuditRecord";
import { toCallAttempt, toTelephonyAuditRecord } from "../mappers/telephonyMapper";

const TARGET_TYPE_CALL_ATTEMPT = "CallAttempt";
/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the identical comment in leads' PrismaLeadRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(call: CallAttempt): Prisma.InputJsonValue {
  return {
    id: call.id,
    organizationId: call.organizationId,
    leadId: call.leadId,
    customerId: call.customerId,
    agentUserId: call.agentUserId,
    direction: call.direction,
    status: call.status,
    disposition: call.disposition,
    callOutcomeId: call.callOutcomeId,
    providerCallId: call.providerCallId,
    durationSeconds: call.durationSeconds,
  };
}

export class PrismaCallAttemptRepository implements CallAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CallAttempt | null> {
    const row = await this.prisma.callAttempt.findUnique({ where: { id } });
    return row ? toCallAttempt(row) : null;
  }

  async list(organizationId: string, filter?: ListCallAttemptsFilter): Promise<CallAttempt[]> {
    const rows = await this.prisma.callAttempt.findMany({
      where: this.buildWhere(organizationId, filter),
      orderBy: { initiatedAt: "desc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toCallAttempt);
  }

  async listByLead(leadId: string): Promise<CallAttempt[]> {
    const rows = await this.prisma.callAttempt.findMany({
      where: { leadId },
      orderBy: { initiatedAt: "desc" },
    });
    return rows.map(toCallAttempt);
  }

  async listByCustomer(customerId: string): Promise<CallAttempt[]> {
    const rows = await this.prisma.callAttempt.findMany({
      where: { customerId },
      orderBy: { initiatedAt: "desc" },
    });
    return rows.map(toCallAttempt);
  }

  async count(organizationId: string, filter?: ListCallAttemptsFilter): Promise<number> {
    return this.prisma.callAttempt.count({ where: this.buildWhere(organizationId, filter) });
  }

  private buildWhere(
    organizationId: string,
    filter?: ListCallAttemptsFilter,
  ): Prisma.CallAttemptWhereInput {
    const where: Prisma.CallAttemptWhereInput = { organizationId };
    if (filter?.leadId) where.leadId = filter.leadId;
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.agentUserId) where.agentUserId = filter.agentUserId;
    if (filter?.direction) where.direction = filter.direction;
    if (filter?.missedOnly) {
      where.status = { in: MISSED_CALL_STATUSES };
    } else if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.initiatedFrom || filter?.initiatedTo) {
      where.initiatedAt = {
        ...(filter.initiatedFrom ? { gte: filter.initiatedFrom } : {}),
        ...(filter.initiatedTo ? { lte: filter.initiatedTo } : {}),
      };
    }
    return where;
  }

  async createWithAudit(
    data: CreateCallAttemptData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallAttempt> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.callAttempt.create({
        data: {
          organizationId: data.organizationId,
          leadId: data.leadId,
          customerId: data.customerId,
          agentUserId: data.agentUserId,
          direction: data.direction,
          status: data.status,
          callerIdUsed: data.callerIdUsed ?? null,
          providerCallId: data.providerCallId ?? null,
          retryOfCallAttemptId: data.retryOfCallAttemptId ?? null,
        },
      });
      const call = toCallAttempt(row);

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: call.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallAttemptCreated",
          targetType: TARGET_TYPE_CALL_ATTEMPT,
          targetId: call.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(call),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return call;
    });
  }

  async updateStatusWithAudit(
    id: string,
    data: UpdateCallStatusData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallAttempt> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.callAttempt.findUniqueOrThrow({ where: { id } });
      const before = toCallAttempt(beforeRow);

      const afterRow = await tx.callAttempt.update({
        where: { id },
        data: {
          status: data.status,
          disposition: data.disposition,
          callOutcomeId: data.callOutcomeId,
          answeredAt: data.answeredAt,
          endedAt: data.endedAt,
          durationSeconds: data.durationSeconds,
        },
      });
      const after = toCallAttempt(afterRow);

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallAttemptStatusChanged",
          targetType: TARGET_TYPE_CALL_ATTEMPT,
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

  async listAuditLog(callAttemptId: string): Promise<TelephonyAuditRecord[]> {
    const rows = await this.prisma.telephonyAuditLog.findMany({
      where: { targetType: TARGET_TYPE_CALL_ATTEMPT, targetId: callAttemptId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toTelephonyAuditRecord);
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<TelephonyAuditRecord[]> {
    const rows = await this.prisma.telephonyAuditLog.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map(toTelephonyAuditRecord);
  }

  async countInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    filter?: { statuses?: CallAttempt["status"][] },
  ): Promise<number> {
    return this.prisma.callAttempt.count({
      where: {
        organizationId,
        initiatedAt: { gte: range.from, lte: range.to },
        ...(filter?.statuses ? { status: { in: filter.statuses } } : {}),
      },
    });
  }

  async averageDurationInRange(
    organizationId: string,
    range: { from: Date; to: Date },
  ): Promise<number | null> {
    const result = await this.prisma.callAttempt.aggregate({
      where: {
        organizationId,
        initiatedAt: { gte: range.from, lte: range.to },
        durationSeconds: { not: null },
      },
      _avg: { durationSeconds: true },
    });
    return result._avg.durationSeconds !== null ? Math.round(result._avg.durationSeconds) : null;
  }

  async countByAgentInRange(
    organizationId: string,
    range: { from: Date; to: Date },
  ): Promise<CallsByAgentEntry[]> {
    const groups = await this.prisma.callAttempt.groupBy({
      by: ["agentUserId"],
      where: { organizationId, initiatedAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    });
    return groups
      .map((group) => ({ agentUserId: group.agentUserId, count: group._count._all }))
      .sort((a, b) => b.count - a.count);
  }

  async listRecent(organizationId: string, limit: number): Promise<CallAttempt[]> {
    const rows = await this.prisma.callAttempt.findMany({
      where: { organizationId },
      orderBy: { initiatedAt: "desc" },
      take: limit,
    });
    return rows.map(toCallAttempt);
  }
}
