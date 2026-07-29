// ============================================================================
// src/modules/follow-ups/infrastructure/repositories/PrismaFollowUpRepository.ts
//
// Prisma-backed implementation of FollowUpRepository. Every write method
// wraps the FollowUp row (and, where relevant, its FollowUpReassignment
// row) plus its Audit Record in one `$transaction` — see leads'
// PrismaLeadRepository.ts's identical pattern.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CompleteFollowUpData,
  CreateFollowUpData,
  EscalateFollowUpData,
  FollowUpRepository,
  ListDueFollowUpsFilter,
  ListFollowUpsFilter,
  ReassignFollowUpData,
  UpdateFollowUpData,
} from "../../domain/repositories/FollowUpRepository";
import type { FollowUp } from "../../domain/entities/FollowUp";
import type { FollowUpReassignment } from "../../domain/entities/FollowUpReassignment";
import type {
  FollowUpAuditActor,
  FollowUpAuditRecord,
} from "../../domain/entities/FollowUpAuditRecord";
import {
  toFollowUp,
  toFollowUpAuditRecord,
  toFollowUpReassignment,
} from "../mappers/followUpMapper";

const TARGET_TYPE_FOLLOW_UP = "FollowUp";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the identical comment in organization's PrismaTeamRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(followUp: FollowUp): Prisma.InputJsonValue {
  return {
    id: followUp.id,
    organizationId: followUp.organizationId,
    leadId: followUp.leadId,
    triggerType: followUp.triggerType,
    status: followUp.status,
    scheduledFor: followUp.scheduledFor.toISOString(),
    currentAssigneeUserId: followUp.currentAssigneeUserId,
    completedAt: followUp.completedAt ? followUp.completedAt.toISOString() : null,
    outcomeNotes: followUp.outcomeNotes,
    missedAt: followUp.missedAt ? followUp.missedAt.toISOString() : null,
    escalatedAt: followUp.escalatedAt ? followUp.escalatedAt.toISOString() : null,
    escalatedToUserId: followUp.escalatedToUserId,
  };
}

export class PrismaFollowUpRepository implements FollowUpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<FollowUp | null> {
    const row = await this.prisma.followUp.findUnique({ where: { id } });
    return row ? toFollowUp(row) : null;
  }

  async list(organizationId: string, filter?: ListFollowUpsFilter): Promise<FollowUp[]> {
    const rows = await this.prisma.followUp.findMany({
      where: this.buildWhere(organizationId, filter),
      orderBy: { scheduledFor: "asc" },
      take: filter?.limit ?? 50,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toFollowUp);
  }

  async listByLead(leadId: string): Promise<FollowUp[]> {
    const rows = await this.prisma.followUp.findMany({
      where: { leadId },
      orderBy: { scheduledFor: "desc" },
    });
    return rows.map(toFollowUp);
  }

  async count(organizationId: string, filter?: ListFollowUpsFilter): Promise<number> {
    return this.prisma.followUp.count({ where: this.buildWhere(organizationId, filter) });
  }

  private buildWhere(
    organizationId: string,
    filter?: ListFollowUpsFilter,
  ): Prisma.FollowUpWhereInput {
    const where: Prisma.FollowUpWhereInput = { organizationId };
    if (filter?.leadId) where.leadId = filter.leadId;
    if (filter?.leadIds?.length) where.leadId = { in: filter.leadIds };
    if (filter?.status) where.status = filter.status;
    if (filter?.assignedToUserIds) where.currentAssigneeUserId = { in: filter.assignedToUserIds };
    if (filter?.scheduledFrom || filter?.scheduledTo) {
      where.scheduledFor = {
        ...(filter.scheduledFrom ? { gte: filter.scheduledFrom } : {}),
        ...(filter.scheduledTo ? { lte: filter.scheduledTo } : {}),
      };
    }
    return where;
  }

  async createWithAudit(
    data: CreateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.create({
        data: {
          organizationId: data.organizationId,
          leadId: data.leadId,
          triggerType: data.triggerType,
          scheduledFor: data.scheduledFor,
          currentAssigneeUserId: data.currentAssigneeUserId,
          createdByUserId: data.createdByUserId,
        },
      });
      const followUp = toFollowUp(row);

      await tx.followUpAuditLog.create({
        data: {
          organizationId: followUp.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "FollowUpCreated",
          targetType: TARGET_TYPE_FOLLOW_UP,
          targetId: followUp.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toAuditJson(followUp),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return followUp;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.followUp.findUniqueOrThrow({ where: { id } });
      const before = toFollowUp(beforeRow);

      const afterRow = await tx.followUp.update({
        where: { id },
        data: {
          triggerType: data.triggerType,
          scheduledFor: data.scheduledFor,
          outcomeNotes: data.outcomeNotes,
        },
      });
      const after = toFollowUp(afterRow);

      await tx.followUpAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "FollowUpUpdated",
          targetType: TARGET_TYPE_FOLLOW_UP,
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

  async completeWithAudit(
    id: string,
    data: CompleteFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.followUp.findUniqueOrThrow({ where: { id } });
      const before = toFollowUp(beforeRow);

      const afterRow = await tx.followUp.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedByUserId: data.completedByUserId,
          outcomeNotes: data.outcomeNotes,
        },
      });
      const after = toFollowUp(afterRow);

      await tx.followUpAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "FollowUpCompleted",
          targetType: TARGET_TYPE_FOLLOW_UP,
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

  async reassignWithAudit(
    id: string,
    data: ReassignFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.followUp.findUniqueOrThrow({ where: { id } });
      const before = toFollowUp(beforeRow);

      await tx.followUpReassignment.create({
        data: {
          followUpId: id,
          fromUserId: before.currentAssigneeUserId,
          toUserId: data.toUserId,
          reassignedByUserId: data.reassignedByUserId,
          reason: data.reason,
        },
      });

      const afterRow = await tx.followUp.update({
        where: { id },
        data: { currentAssigneeUserId: data.toUserId },
      });
      const after = toFollowUp(afterRow);

      await tx.followUpAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "FollowUpReassigned",
          targetType: TARGET_TYPE_FOLLOW_UP,
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

  async markDueWithAudit(
    id: string,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.followUp.findUniqueOrThrow({ where: { id } });
      const before = toFollowUp(beforeRow);
      if (before.status === "DUE") return before;
      if (before.status !== "SCHEDULED") {
        return before;
      }

      const afterRow = await tx.followUp.update({
        where: { id },
        data: { status: "DUE" },
      });
      const after = toFollowUp(afterRow);

      await tx.followUpAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "FollowUpMarkedDue",
          targetType: TARGET_TYPE_FOLLOW_UP,
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

  async markMissedWithAudit(
    id: string,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
    missedAt?: Date,
  ): Promise<FollowUp> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.followUp.findUniqueOrThrow({ where: { id } });
      const before = toFollowUp(beforeRow);
      if (before.status === "MISSED" || before.status === "ESCALATED") {
        return before;
      }
      if (before.status === "COMPLETED" || before.status === "CANCELLED") {
        return before;
      }

      const at = missedAt ?? new Date();
      const afterRow = await tx.followUp.update({
        where: { id },
        data: { status: "MISSED", missedAt: at },
      });
      const after = toFollowUp(afterRow);

      await tx.followUpAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "FollowUpMarkedMissed",
          targetType: TARGET_TYPE_FOLLOW_UP,
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

  async escalateWithAudit(
    id: string,
    data: EscalateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
    escalatedAt?: Date,
  ): Promise<FollowUp> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.followUp.findUniqueOrThrow({ where: { id } });
      const before = toFollowUp(beforeRow);
      if (before.status === "COMPLETED" || before.status === "CANCELLED") {
        return before;
      }
      if (
        before.escalatedAt &&
        before.escalatedToUserId === data.escalatedToUserId &&
        (data.markEscalated === false || before.status === "ESCALATED")
      ) {
        return before;
      }

      const at = escalatedAt ?? new Date();
      const afterRow = await tx.followUp.update({
        where: { id },
        data: {
          status: data.markEscalated === false ? before.status : "ESCALATED",
          escalatedAt: at,
          escalatedToUserId: data.escalatedToUserId,
        },
      });
      const after = toFollowUp(afterRow);

      await tx.followUpAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "FollowUpEscalated",
          targetType: TARGET_TYPE_FOLLOW_UP,
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

  async listDueCandidates(
    organizationId: string,
    filter: ListDueFollowUpsFilter,
  ): Promise<FollowUp[]> {
    const where: Prisma.FollowUpWhereInput = {
      organizationId,
      scheduledFor: { lte: filter.dueBy },
      status: filter.statuses
        ? { in: filter.statuses }
        : { in: ["SCHEDULED", "DUE", "MISSED", "ESCALATED"] },
    };
    if (filter.triggerType) where.triggerType = filter.triggerType;
    if (filter.notEscalated) where.escalatedAt = null;

    const rows = await this.prisma.followUp.findMany({
      where,
      orderBy: { scheduledFor: "asc" },
      take: filter.limit ?? 100,
    });
    return rows.map(toFollowUp);
  }

  async listReassignmentHistory(followUpId: string): Promise<FollowUpReassignment[]> {
    const rows = await this.prisma.followUpReassignment.findMany({
      where: { followUpId },
      orderBy: { reassignedAt: "desc" },
    });
    return rows.map(toFollowUpReassignment);
  }

  async listAuditLog(followUpId: string): Promise<FollowUpAuditRecord[]> {
    const rows = await this.prisma.followUpAuditLog.findMany({
      where: { targetType: TARGET_TYPE_FOLLOW_UP, targetId: followUpId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toFollowUpAuditRecord);
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<FollowUpAuditRecord[]> {
    const rows = await this.prisma.followUpAuditLog.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map(toFollowUpAuditRecord);
  }
}
