// ============================================================================
// src/modules/campaigns/infrastructure/repositories/PrismaCampaignRepository.ts
//
// Prisma-backed implementation of CampaignRepository. Every write method
// wraps its row(s) plus an Audit Record in one `$transaction` — see
// organization's PrismaTeamRepository.ts's identical pattern. Audit Records
// live in `campaigns.campaign_audit_log`, distinguished by `targetType`.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CampaignRepository,
  CreateAssignmentData,
  CreateCampaignData,
  UpdateCampaignData,
} from "../../domain/repositories/CampaignRepository";
import type { Campaign, CampaignStatus } from "../../domain/entities/Campaign";
import type { CampaignMembership } from "../../domain/entities/CampaignMembership";
import type {
  CampaignAssignment,
  CampaignAssignmentAllocation,
  CampaignAssignmentStatus,
} from "../../domain/entities/CampaignAssignment";
import type {
  CampaignAuditActor,
  CampaignAuditRecord,
} from "../../domain/entities/CampaignAuditRecord";
import {
  toCampaign,
  toCampaignAssignment,
  toCampaignAssignmentAllocation,
  toCampaignAuditRecord,
  toCampaignMembership,
} from "../mappers/campaignMapper";

const TARGET_TYPE_CAMPAIGN = "Campaign";
const TARGET_TYPE_MEMBERSHIP = "CampaignMembership";
const TARGET_TYPE_ASSIGNMENT = "CampaignAssignment";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the identical comment in organization's PrismaTeamRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toCampaignAuditJson(campaign: Campaign): Prisma.InputJsonValue {
  return {
    id: campaign.id,
    organizationId: campaign.organizationId,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
    endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
  };
}

function toMembershipAuditJson(membership: CampaignMembership): Prisma.InputJsonValue {
  return {
    campaignId: membership.campaignId,
    userId: membership.userId,
    allocationWeight: membership.allocationWeight,
    isActive: membership.isActive,
  };
}

export class PrismaCampaignRepository implements CampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Campaign | null> {
    const row = await this.prisma.campaign.findUnique({ where: { id } });
    return row ? toCampaign(row) : null;
  }

  async list(organizationId: string): Promise<Campaign[]> {
    const rows = await this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCampaign);
  }

  async count(organizationId: string): Promise<number> {
    return this.prisma.campaign.count({ where: { organizationId } });
  }

  async createWithAudit(
    data: CreateCampaignData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.campaign.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          description: data.description ?? null,
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          createdByUserId: data.createdByUserId,
        },
      });
      const campaign = toCampaign(row);

      await tx.campaignAuditLog.create({
        data: {
          organizationId: campaign.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CampaignCreated",
          targetType: TARGET_TYPE_CAMPAIGN,
          targetId: campaign.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toCampaignAuditJson(campaign),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return campaign;
    });
  }

  async updateWithAudit(
    id: string,
    data: UpdateCampaignData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.campaign.findUniqueOrThrow({ where: { id } });
      const before = toCampaign(beforeRow);

      const afterRow = await tx.campaign.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
        },
      });
      const after = toCampaign(afterRow);

      await tx.campaignAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CampaignUpdated",
          targetType: TARGET_TYPE_CAMPAIGN,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toCampaignAuditJson(before),
          afterState: toCampaignAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async changeStatusWithAudit(
    id: string,
    status: CampaignStatus,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<Campaign> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.campaign.findUniqueOrThrow({ where: { id } });
      const before = toCampaign(beforeRow);

      const afterRow = await tx.campaign.update({ where: { id }, data: { status } });
      const after = toCampaign(afterRow);

      await tx.campaignAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CampaignStatusChanged",
          targetType: TARGET_TYPE_CAMPAIGN,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: toCampaignAuditJson(before),
          afterState: toCampaignAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async listMembers(campaignId: string): Promise<CampaignMembership[]> {
    const rows = await this.prisma.campaignMembership.findMany({
      where: { campaignId },
      orderBy: { joinedAt: "asc" },
    });
    return rows.map(toCampaignMembership);
  }

  async findMembership(campaignId: string, userId: string): Promise<CampaignMembership | null> {
    const row = await this.prisma.campaignMembership.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    return row ? toCampaignMembership(row) : null;
  }

  async addMemberWithAudit(
    campaignId: string,
    userId: string,
    allocationWeight: number,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignMembership> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.campaignMembership.upsert({
        where: { campaignId_userId: { campaignId, userId } },
        create: { campaignId, userId, allocationWeight },
        update: { allocationWeight, isActive: true, leftAt: null },
      });
      const membership = toCampaignMembership(row);

      await tx.campaignAuditLog.create({
        data: {
          organizationId: (await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } }))
            .organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CampaignMemberAdded",
          targetType: TARGET_TYPE_MEMBERSHIP,
          targetId: campaignId,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: toMembershipAuditJson(membership),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return membership;
    });
  }

  async removeMemberWithAudit(
    campaignId: string,
    userId: string,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignMembership> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.campaignMembership.findUniqueOrThrow({
        where: { campaignId_userId: { campaignId, userId } },
      });
      const before = toCampaignMembership(beforeRow);

      const afterRow = await tx.campaignMembership.update({
        where: { campaignId_userId: { campaignId, userId } },
        data: { isActive: false, leftAt: new Date() },
      });
      const after = toCampaignMembership(afterRow);

      await tx.campaignAuditLog.create({
        data: {
          organizationId: (await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } }))
            .organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CampaignMemberRemoved",
          targetType: TARGET_TYPE_MEMBERSHIP,
          targetId: campaignId,
          correlationId: correlationId ?? null,
          beforeState: toMembershipAuditJson(before),
          afterState: toMembershipAuditJson(after),
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async createAssignmentWithAudit(
    data: CreateAssignmentData,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignAssignment> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.campaignAssignment.create({
        data: {
          campaignId: data.campaignId,
          initiatedByUserId: data.initiatedByUserId,
          allocationMethod: data.allocationMethod,
          targetLeadCount: data.targetLeadCount,
          status: "EXECUTING",
          allocations: {
            create: data.allocations.map((allocation) => ({
              userId: allocation.userId,
              allocatedCount: allocation.allocatedCount,
              allocatedPercentage: allocation.allocatedPercentage,
            })),
          },
        },
      });
      const assignment = toCampaignAssignment(row);

      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: data.campaignId } });

      await tx.campaignAuditLog.create({
        data: {
          organizationId: campaign.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CampaignAssignmentCreated",
          targetType: TARGET_TYPE_ASSIGNMENT,
          targetId: assignment.id,
          correlationId: correlationId ?? null,
          beforeState: undefined,
          afterState: {
            campaignId: assignment.campaignId,
            allocationMethod: assignment.allocationMethod,
            targetLeadCount: assignment.targetLeadCount,
            allocations: data.allocations,
          },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return assignment;
    });
  }

  async markAssignmentExecutedWithAudit(
    id: string,
    status: Extract<CampaignAssignmentStatus, "COMPLETED" | "FAILED">,
    actor: CampaignAuditActor,
    correlationId?: string | null,
  ): Promise<CampaignAssignment> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.campaignAssignment.findUniqueOrThrow({ where: { id } });
      const before = toCampaignAssignment(beforeRow);

      const afterRow = await tx.campaignAssignment.update({
        where: { id },
        data: { status, executedAt: new Date() },
      });
      const after = toCampaignAssignment(afterRow);

      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: after.campaignId } });

      await tx.campaignAuditLog.create({
        data: {
          organizationId: campaign.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "CampaignAssignmentExecuted",
          targetType: TARGET_TYPE_ASSIGNMENT,
          targetId: after.id,
          correlationId: correlationId ?? null,
          beforeState: { status: before.status },
          afterState: { status: after.status, executedAt: after.executedAt?.toISOString() ?? null },
          recordHash: PLACEHOLDER_RECORD_HASH,
        },
      });

      return after;
    });
  }

  async listAssignments(campaignId: string): Promise<CampaignAssignment[]> {
    const rows = await this.prisma.campaignAssignment.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCampaignAssignment);
  }

  async listAssignmentAllocations(
    campaignAssignmentId: string,
  ): Promise<CampaignAssignmentAllocation[]> {
    const rows = await this.prisma.campaignAssignmentAllocation.findMany({
      where: { campaignAssignmentId },
    });
    return rows.map(toCampaignAssignmentAllocation);
  }

  async listAuditLog(campaignId: string): Promise<CampaignAuditRecord[]> {
    const rows = await this.prisma.campaignAuditLog.findMany({
      where: {
        OR: [
          { targetType: TARGET_TYPE_CAMPAIGN, targetId: campaignId },
          { targetType: TARGET_TYPE_MEMBERSHIP, targetId: campaignId },
        ],
      },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toCampaignAuditRecord);
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<CampaignAuditRecord[]> {
    const rows = await this.prisma.campaignAuditLog.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map(toCampaignAuditRecord);
  }
}
