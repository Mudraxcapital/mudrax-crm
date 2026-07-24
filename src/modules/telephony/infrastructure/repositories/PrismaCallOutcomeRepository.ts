// ============================================================================
// src/modules/telephony/infrastructure/repositories/PrismaCallOutcomeRepository.ts
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CallOutcomeRepository,
  CreateCallOutcomeData,
  UpdateCallOutcomeData,
} from "../../domain/repositories/CallOutcomeRepository";
import type { CallOutcome } from "../../domain/entities/CallOutcome";
import type { TelephonyAuditActor } from "../../domain/entities/TelephonyAuditRecord";
import { toCallOutcome } from "../mappers/telephonyMapper";

const TARGET_TYPE_CALL_OUTCOME = "CallOutcome";
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(outcome: CallOutcome): Prisma.InputJsonValue {
  return {
    id: outcome.id,
    organizationId: outcome.organizationId,
    name: outcome.name,
    isActive: outcome.isActive,
    sortOrder: outcome.sortOrder,
  };
}

export class PrismaCallOutcomeRepository implements CallOutcomeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CallOutcome | null> {
    const row = await this.prisma.callOutcome.findUnique({ where: { id } });
    return row ? toCallOutcome(row) : null;
  }

  async findByName(organizationId: string, name: string): Promise<CallOutcome | null> {
    const row = await this.prisma.callOutcome.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
    return row ? toCallOutcome(row) : null;
  }

  async list(organizationId: string): Promise<CallOutcome[]> {
    const rows = await this.prisma.callOutcome.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toCallOutcome);
  }

  async createWithAudit(
    data: CreateCallOutcomeData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.callOutcome.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          sortOrder: data.sortOrder ?? 0,
        },
      });
      const outcome = toCallOutcome(row);

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: outcome.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallOutcomeCreated",
          targetType: TARGET_TYPE_CALL_OUTCOME,
          targetId: outcome.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(outcome),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return outcome;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateCallOutcomeData,
    actor: TelephonyAuditActor,
    correlationId?: string | null,
  ): Promise<CallOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.callOutcome.findUniqueOrThrow({ where: { id } });
      const before = toCallOutcome(beforeRow);

      const afterRow = await tx.callOutcome.update({
        where: { id },
        data: { name: data.name, isActive: data.isActive, sortOrder: data.sortOrder },
      });
      const after = toCallOutcome(afterRow);

      await tx.telephonyAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CallOutcomeUpdated",
          targetType: TARGET_TYPE_CALL_OUTCOME,
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
}
