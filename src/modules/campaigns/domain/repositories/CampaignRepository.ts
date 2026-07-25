// ============================================================================
// src/modules/campaigns/domain/repositories/CampaignRepository.ts
//
// Repository interface (domain layer — no Prisma import here). Implemented
// by infrastructure/repositories/PrismaCampaignRepository.
// ============================================================================

import type { Campaign, CampaignStatus } from "../entities/Campaign";
import type { CampaignMembership } from "../entities/CampaignMembership";
import type {
  AllocationMethod,
  CampaignAssignment,
  CampaignAssignmentAllocation,
  CampaignAssignmentStatus,
} from "../entities/CampaignAssignment";
import type { CampaignAuditActor, CampaignAuditRecord } from "../entities/CampaignAuditRecord";

export interface CreateCampaignData {
  organizationId: string;
  name: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdByUserId: string;
  ownerManagerId: string;
}

export interface ListCampaignsFilter {
  ownerManagerId?: string;
}

export interface UpdateCampaignData {
  name?: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface CreateAssignmentData {
  campaignId: string;
  initiatedByUserId: string;
  allocationMethod: AllocationMethod;
  targetLeadCount: number;
  allocations: { userId: string; allocatedCount: number; allocatedPercentage: number | null }[];
}

export interface CampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  list(organizationId: string, filter?: ListCampaignsFilter): Promise<Campaign[]>;
  count(organizationId: string, filter?: ListCampaignsFilter): Promise<number>;

  /** Creates the Campaign and a "created" Audit Record atomically. */
  createWithAudit(
    data: CreateCampaignData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign>;

  /** Updates the Campaign's editable fields and its "updated" Audit Record atomically. */
  updateWithAudit(
    id: string,
    data: UpdateCampaignData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign>;

  /** Changes Campaign Status and records a "status changed" Audit Record atomically. */
  changeStatusWithAudit(
    id: string,
    status: CampaignStatus,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign>;

  listMembers(campaignId: string): Promise<CampaignMembership[]>;
  findMembership(campaignId: string, userId: string): Promise<CampaignMembership | null>;
  /** Active Campaign memberships for a User (Caller "My Campaigns"). */
  listActiveMembershipsForUser(userId: string): Promise<CampaignMembership[]>;

  /** Upserts an active CampaignMembership row and records a "member added" Audit Record atomically. */
  addMemberWithAudit(
    campaignId: string,
    userId: string,
    allocationWeight: number,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignMembership>;

  /** Deactivates a CampaignMembership row and records a "member removed" Audit Record atomically. */
  removeMemberWithAudit(
    campaignId: string,
    userId: string,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignMembership>;

  /** Creates the CampaignAssignment (allocation decision) plus its per-member Allocation rows and a "created" Audit Record atomically. */
  createAssignmentWithAudit(
    data: CreateAssignmentData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignAssignment>;

  /** Marks a CampaignAssignment's execution outcome (after `leads`.assignLead calls complete) and records an Audit Record atomically. */
  markAssignmentExecutedWithAudit(
    id: string,
    status: Extract<CampaignAssignmentStatus, "COMPLETED" | "FAILED">,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignAssignment>;

  listAssignments(campaignId: string): Promise<CampaignAssignment[]>;
  listAssignmentAllocations(campaignAssignmentId: string): Promise<CampaignAssignmentAllocation[]>;

  /** Read-only Audit Trail access, scoped to one Campaign (platform-contracts.md §4). */
  listAuditLog(campaignId: string): Promise<CampaignAuditRecord[]>;

  /** Read-only Audit Trail access for the whole Organization (Activity Timeline / CRM Dashboard "Recent Activities"). */
  listRecentAuditLog(organizationId: string, limit: number): Promise<CampaignAuditRecord[]>;
}
