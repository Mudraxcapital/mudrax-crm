// ============================================================================
// src/modules/follow-ups/domain/repositories/FollowUpRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaFollowUpRepository.
// ============================================================================

import type { FollowUp, FollowUpStatus, FollowUpTriggerType } from "../entities/FollowUp";
import type { FollowUpReassignment } from "../entities/FollowUpReassignment";
import type { FollowUpAuditActor, FollowUpAuditRecord } from "../entities/FollowUpAuditRecord";

export interface CreateFollowUpData {
  organizationId: string;
  leadId: string;
  triggerType: FollowUpTriggerType;
  scheduledFor: Date;
  currentAssigneeUserId: string;
  createdByUserId: string;
}

export interface UpdateFollowUpData {
  triggerType?: FollowUpTriggerType;
  scheduledFor?: Date;
  outcomeNotes?: string | null;
}

export interface CompleteFollowUpData {
  completedByUserId: string;
  outcomeNotes: string | null;
}

export interface ReassignFollowUpData {
  toUserId: string;
  reassignedByUserId: string;
  reason: string | null;
}

export interface ListFollowUpsFilter {
  leadId?: string;
  /** Restricts to Follow-ups on any of these Leads (customer profile, bulk). */
  leadIds?: string[];
  status?: FollowUpStatus;
  /** Restricts to Follow-ups currently assigned to one of these Users — used to enforce RBAC Data Scope (SELF/TEAM/BRANCH) at the presentation boundary. */
  assignedToUserIds?: string[];
  /** Inclusive lower bound on scheduledFor (calendar date-range queries). */
  scheduledFrom?: Date;
  /** Inclusive upper bound on scheduledFor (calendar date-range queries). */
  scheduledTo?: Date;
  limit?: number;
  offset?: number;
}

export interface FollowUpRepository {
  findById(id: string): Promise<FollowUp | null>;
  list(organizationId: string, filter?: ListFollowUpsFilter): Promise<FollowUp[]>;
  listByLead(leadId: string): Promise<FollowUp[]>;
  count(organizationId: string, filter?: ListFollowUpsFilter): Promise<number>;

  /** Creates the Follow-up and a "created" Audit Record atomically. */
  createWithAudit(
    data: CreateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp>;

  /** Updates the Follow-up's editable fields (reschedule/trigger type/notes) and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp>;

  /** Marks the Follow-up Completed and records a "completed" Audit Record atomically. */
  completeWithAudit(
    id: string,
    data: CompleteFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp>;

  /** Creates a FollowUpReassignment row, updates the current assignee, and records a "reassigned" Audit Record — all atomically. */
  reassignWithAudit(
    id: string,
    data: ReassignFollowUpData,
    actor: FollowUpAuditActor,
    correlationId?: string | null,
  ): Promise<FollowUp>;

  listReassignmentHistory(followUpId: string): Promise<FollowUpReassignment[]>;

  /** Read-only Audit Trail access, scoped to one Follow-up (platform-contracts.md §4). */
  listAuditLog(followUpId: string): Promise<FollowUpAuditRecord[]>;

  /** Read-only Audit Trail access for the whole Organization (Activity Timeline / CRM Dashboard "Recent Activities"). */
  listRecentAuditLog(organizationId: string, limit: number): Promise<FollowUpAuditRecord[]>;
}
