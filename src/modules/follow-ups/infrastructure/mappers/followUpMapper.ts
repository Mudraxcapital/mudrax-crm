// ============================================================================
// src/modules/follow-ups/infrastructure/mappers/followUpMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated FollowUp/FollowUpReassignment/
// FollowUpAuditLog shapes.
// ============================================================================

import type {
  FollowUp as PrismaFollowUp,
  FollowUpReassignment as PrismaFollowUpReassignment,
  FollowUpAuditLog as PrismaFollowUpAuditLog,
} from "@prisma/client";
import type { FollowUp } from "../../domain/entities/FollowUp";
import type { FollowUpReassignment } from "../../domain/entities/FollowUpReassignment";
import type { FollowUpAuditRecord } from "../../domain/entities/FollowUpAuditRecord";

export function toFollowUp(row: PrismaFollowUp): FollowUp {
  return {
    id: row.id,
    organizationId: row.organizationId,
    leadId: row.leadId,
    triggerType: row.triggerType,
    status: row.status,
    scheduledFor: row.scheduledFor,
    currentAssigneeUserId: row.currentAssigneeUserId,
    createdByUserId: row.createdByUserId,
    completedAt: row.completedAt,
    completedByUserId: row.completedByUserId,
    outcomeNotes: row.outcomeNotes,
    missedAt: row.missedAt,
    escalatedAt: row.escalatedAt,
    escalatedToUserId: row.escalatedToUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toFollowUpReassignment(row: PrismaFollowUpReassignment): FollowUpReassignment {
  return {
    id: row.id,
    followUpId: row.followUpId,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    reassignedByUserId: row.reassignedByUserId,
    reason: row.reason,
    reassignedAt: row.reassignedAt,
  };
}

export function toFollowUpAuditRecord(row: PrismaFollowUpAuditLog): FollowUpAuditRecord {
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
