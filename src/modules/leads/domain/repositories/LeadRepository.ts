// ============================================================================
// src/modules/leads/domain/repositories/LeadRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaLeadRepository.
// ============================================================================

import type { Lead } from "../entities/Lead";
import type { AssignmentType, LeadAssignment } from "../entities/LeadAssignment";
import type { LeadAuditActor, LeadAuditRecord } from "../entities/LeadAuditRecord";

export interface CreateLeadData {
  organizationId: string;
  customerId: string;
  leadSourceId: string;
  currentStageId: string;
  campaignId?: string | null;
  ownerManagerId?: string | null;
  ownerTeamLeadId?: string | null;
  fullNameSnapshot: string;
  phoneSnapshot?: string | null;
  emailSnapshot?: string | null;
  initialAssignment?: {
    assignedToUserId: string;
    assignedByUserId: string | null;
    assignmentType: AssignmentType;
  } | null;
}

export interface UpdateLeadData {
  leadSourceId?: string;
  fullNameSnapshot?: string;
  phoneSnapshot?: string | null;
  emailSnapshot?: string | null;
}

export interface ChangeLeadStageData {
  currentStageId: string;
  lostReasonId: string | null;
  wonAt: Date | null;
  lostAt: Date | null;
}

export interface AssignLeadData {
  assignedToUserId: string;
  assignedByUserId: string | null;
  assignmentType: AssignmentType;
  campaignAssignmentId?: string | null;
  /**
   * When set, updates denormalized hierarchy ownership with the assignment
   * (including null clears for Direct Admin Callers).
   */
  ownership?: {
    ownerManagerId: string | null;
    ownerTeamLeadId: string | null;
  };
}

export interface ListLeadsFilter {
  customerId?: string;
  currentStageId?: string;
  leadSourceId?: string;
  campaignId?: string;
  /** Hierarchical Manager book filter. */
  ownerManagerId?: string;
  /** Hierarchical Team Lead filter. */
  ownerTeamLeadId?: string;
  /** Restricts to Leads currently assigned to one of these Users — used to enforce RBAC Data Scope (SELF/TEAM/BRANCH) at the presentation boundary. */
  assignedToUserIds?: string[];
  /** Case-insensitive substring match over searchable system + custom fields. */
  search?: string;
  /**
   * Dynamic filterable custom-field predicates (internalKey → value).
   * System keys `full_name` / `phone` / `email` map to Lead snapshot columns.
   */
  fieldFilters?: Record<string, string>;
  /** Internal keys marked searchable — used to widen global/advanced search. */
  searchableCustomKeys?: string[];
  limit?: number;
  offset?: number;
}

export interface LeadRepository {
  findById(id: string): Promise<Lead | null>;
  /** Batch lookup for bulk authorization / merge (order not guaranteed). */
  findByIds(ids: string[]): Promise<Lead[]>;
  list(organizationId: string, filter?: ListLeadsFilter): Promise<Lead[]>;
  listByCustomer(customerId: string): Promise<Lead[]>;
  /** Used after Customer Merge to keep Lead ownership pointing at the survivor. */
  repointCustomer(fromCustomerId: string, toCustomerId: string): Promise<number>;
  count(organizationId: string, filter?: ListLeadsFilter): Promise<number>;
  countByStage(organizationId: string): Promise<{ stageId: string; count: number }[]>;
  countBySource(organizationId: string): Promise<{ sourceId: string; count: number }[]>;
  /**
   * Hierarchy-aware stage totals in one GROUP BY (Kanban column badges).
   * `currentStageId` on the filter is ignored.
   */
  countGroupedByStage(
    organizationId: string,
    filter?: Omit<ListLeadsFilter, "currentStageId">,
  ): Promise<{ stageId: string; count: number }[]>;
  /**
   * Hierarchy-aware campaign totals in one GROUP BY (pipeline campaign picker).
   * `campaignId` on the filter is ignored.
   */
  countGroupedByCampaign(
    organizationId: string,
    filter?: Omit<ListLeadsFilter, "campaignId">,
  ): Promise<{ campaignId: string; count: number }[]>;

  /** Creates the Lead (and, if provided, its initial Lead Assignment) plus a "created" Audit Record atomically. */
  createWithAudit(
    data: CreateLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead>;

  /** Updates the Lead's editable fields and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead>;

  /** Changes Lead Stage and its "stage changed" Audit Record atomically. */
  changeStageWithAudit(
    id: string,
    data: ChangeLeadStageData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead>;

  /** Closes the current open Lead Assignment (if any), opens a new one, updates the Lead's current assignee, and records an "assigned"/"reassigned" Audit Record — all atomically. */
  assignWithAudit(
    id: string,
    data: AssignLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead>;

  listAssignmentHistory(leadId: string): Promise<LeadAssignment[]>;

  /**
   * Updates the denormalized "next action" projection only — no Audit
   * Record, since this is an internal projection maintained exclusively by
   * the follow-ups module's event listener (leads.md), not a user-facing
   * write.
   */
  updateNextAction(
    leadId: string,
    nextActionAt: Date | null,
    nextActionType: string | null,
  ): Promise<void>;

  /** Read-only Audit Trail access, scoped to one Lead (platform-contracts.md §4). */
  listAuditLog(leadId: string): Promise<LeadAuditRecord[]>;

  /** Read-only Audit Trail access for the whole Organization (Activity Timeline / CRM Dashboard "Recent Activities"). */
  listRecentAuditLog(organizationId: string, limit: number): Promise<LeadAuditRecord[]>;
}
