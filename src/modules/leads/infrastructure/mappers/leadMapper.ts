// ============================================================================
// src/modules/leads/infrastructure/mappers/leadMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated Lead/LeadAssignment/LeadNote/LeadStage/
// LeadSource/LostReason/LeadAuditLog shapes.
// ============================================================================

import type {
  Lead as PrismaLead,
  LeadAssignment as PrismaLeadAssignment,
  LeadNote as PrismaLeadNote,
  LeadStage as PrismaLeadStage,
  LeadSource as PrismaLeadSource,
  LostReason as PrismaLostReason,
  LeadAuditLog as PrismaLeadAuditLog,
} from "@prisma/client";
import type { Lead } from "../../domain/entities/Lead";
import type { LeadAssignment } from "../../domain/entities/LeadAssignment";
import type { LeadNote } from "../../domain/entities/LeadNote";
import type { LeadSource, LeadStage, LostReason } from "../../domain/entities/LeadCatalogs";
import type { LeadAuditRecord } from "../../domain/entities/LeadAuditRecord";

export function toLead(row: PrismaLead): Lead {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    leadSourceId: row.leadSourceId,
    currentStageId: row.currentStageId,
    lostReasonId: row.lostReasonId,
    campaignId: row.campaignId,
    currentAssigneeUserId: row.currentAssigneeUserId,
    fullNameSnapshot: row.fullNameSnapshot,
    phoneSnapshot: row.phoneSnapshot,
    emailSnapshot: row.emailSnapshot,
    nextActionAt: row.nextActionAt,
    nextActionType: row.nextActionType,
    wonAt: row.wonAt,
    lostAt: row.lostAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toLeadAssignment(row: PrismaLeadAssignment): LeadAssignment {
  return {
    id: row.id,
    leadId: row.leadId,
    assignedToUserId: row.assignedToUserId,
    assignedByUserId: row.assignedByUserId,
    assignmentType: row.assignmentType,
    campaignAssignmentId: row.campaignAssignmentId,
    assignedAt: row.assignedAt,
    unassignedAt: row.unassignedAt,
  };
}

export function toLeadNote(row: PrismaLeadNote): LeadNote {
  return {
    id: row.id,
    leadId: row.leadId,
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: row.createdAt,
  };
}

export function toLeadStage(row: PrismaLeadStage): LeadStage {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    bucket: row.bucket,
    closeOutcome: row.closeOutcome,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function toLeadSource(row: PrismaLeadSource): LeadSource {
  return { id: row.id, organizationId: row.organizationId, name: row.name, isActive: row.isActive };
}

export function toLostReason(row: PrismaLostReason): LostReason {
  return { id: row.id, organizationId: row.organizationId, name: row.name, isActive: row.isActive };
}

export function toLeadAuditRecord(row: PrismaLeadAuditLog): LeadAuditRecord {
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
