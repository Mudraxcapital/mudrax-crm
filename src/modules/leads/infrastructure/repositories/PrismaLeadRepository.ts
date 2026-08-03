// ============================================================================
// src/modules/leads/infrastructure/repositories/PrismaLeadRepository.ts
//
// Prisma-backed implementation of LeadRepository. Every write method wraps
// the Lead row (and, where relevant, its LeadAssignment row) plus its Audit
// Record in one `$transaction`. Audit Records live in
// `leads.lead_audit_log`, distinguished by `targetType = "Lead"` — see
// organization's PrismaTeamRepository.ts's identical pattern.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AssignLeadData,
  ChangeLeadStageData,
  CreateLeadData,
  LeadRepository,
  ListLeadsFilter,
  UpdateLeadData,
} from "../../domain/repositories/LeadRepository";
import type { Lead } from "../../domain/entities/Lead";
import type { LeadAssignment } from "../../domain/entities/LeadAssignment";
import type { LeadAuditActor, LeadAuditRecord } from "../../domain/entities/LeadAuditRecord";
import { toLead, toLeadAssignment, toLeadAuditRecord } from "../mappers/leadMapper";

const TARGET_TYPE_LEAD = "Lead";

/** Always overwritten by the database's BEFORE INSERT hash-chain trigger — see the identical comment in organization's PrismaTeamRepository.ts. */
const PLACEHOLDER_RECORD_HASH = "pending-hash-chain-trigger";

function toAuditJson(lead: Lead): Prisma.InputJsonValue {
  return {
    id: lead.id,
    organizationId: lead.organizationId,
    customerId: lead.customerId,
    leadSourceId: lead.leadSourceId,
    currentStageId: lead.currentStageId,
    lostReasonId: lead.lostReasonId,
    currentAssigneeUserId: lead.currentAssigneeUserId,
    fullNameSnapshot: lead.fullNameSnapshot,
    phoneSnapshot: lead.phoneSnapshot,
    emailSnapshot: lead.emailSnapshot,
    wonAt: lead.wonAt,
    lostAt: lead.lostAt,
  };
}

export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Lead | null> {
    const row = await this.prisma.lead.findUnique({ where: { id } });
    return row ? toLead(row) : null;
  }

  async findByIds(ids: string[]): Promise<Lead[]> {
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    const rows = await this.prisma.lead.findMany({ where: { id: { in: unique } } });
    return rows.map(toLead);
  }

  async list(organizationId: string, filter?: ListLeadsFilter): Promise<Lead[]> {
    const where = this.buildWhere(organizationId, filter);
    // id tie-breaker keeps order stable when many import rows share createdAt —
    // otherwise a status update can reshuffle the row to the top of the page.
    const createdAtDir = filter?.sortCreatedAt === "asc" ? "asc" : "desc";
    const rows = await this.prisma.lead.findMany({
      where,
      orderBy: [{ createdAt: createdAtDir }, { id: "asc" }],
      // Default high enough for campaign/import workflows; UI pages should
      // still pass an explicit limit + use count() for totals.
      take: filter?.limit ?? 10_000,
      skip: filter?.offset ?? 0,
    });
    return rows.map(toLead);
  }

  async listByCustomer(customerId: string): Promise<Lead[]> {
    const rows = await this.prisma.lead.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toLead);
  }

  async repointCustomer(fromCustomerId: string, toCustomerId: string): Promise<number> {
    const result = await this.prisma.lead.updateMany({
      where: { customerId: fromCustomerId },
      data: { customerId: toCustomerId },
    });
    return result.count;
  }

  async count(organizationId: string, filter?: ListLeadsFilter): Promise<number> {
    return this.prisma.lead.count({ where: this.buildWhere(organizationId, filter) });
  }

  async countDistinctCustomers(
    organizationId: string,
    filter?: ListLeadsFilter,
  ): Promise<number> {
    const groups = await this.prisma.lead.groupBy({
      by: ["customerId"],
      where: this.buildWhere(organizationId, filter),
    });
    return groups.length;
  }

  async listDistinctCustomerIds(
    organizationId: string,
    filter?: ListLeadsFilter,
  ): Promise<string[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ["customerId"],
      where: this.buildWhere(organizationId, filter),
    });
    return groups.map((group) => group.customerId);
  }

  async countByStage(organizationId: string): Promise<{ stageId: string; count: number }[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ["currentStageId"],
      where: { organizationId },
      _count: { _all: true },
    });
    return groups.map((group) => ({ stageId: group.currentStageId, count: group._count._all }));
  }

  async countBySource(organizationId: string): Promise<{ sourceId: string; count: number }[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ["leadSourceId"],
      where: { organizationId },
      _count: { _all: true },
    });
    return groups.map((group) => ({ sourceId: group.leadSourceId, count: group._count._all }));
  }

  async countGroupedByStage(
    organizationId: string,
    filter?: Omit<ListLeadsFilter, "currentStageId">,
  ): Promise<{ stageId: string; count: number }[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ["currentStageId"],
      where: this.buildWhere(organizationId, filter),
      _count: { _all: true },
    });
    return groups.map((group) => ({ stageId: group.currentStageId, count: group._count._all }));
  }

  async countGroupedBySource(
    organizationId: string,
    filter?: Omit<ListLeadsFilter, "leadSourceId">,
  ): Promise<{ sourceId: string; count: number }[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ["leadSourceId"],
      where: this.buildWhere(organizationId, filter),
      _count: { _all: true },
    });
    return groups.map((group) => ({ sourceId: group.leadSourceId, count: group._count._all }));
  }

  async countGroupedByCampaign(
    organizationId: string,
    filter?: Omit<ListLeadsFilter, "campaignId">,
  ): Promise<{ campaignId: string; count: number }[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ["campaignId"],
      where: {
        ...this.buildWhere(organizationId, filter),
        campaignId: { not: null },
      },
      _count: { _all: true },
    });
    return groups
      .filter((group): group is typeof group & { campaignId: string } => group.campaignId != null)
      .map((group) => ({ campaignId: group.campaignId, count: group._count._all }));
  }

  private buildWhere(organizationId: string, filter?: ListLeadsFilter): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = { organizationId };
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.currentStageId) where.currentStageId = filter.currentStageId;
    if (filter?.leadSourceId) where.leadSourceId = filter.leadSourceId;
    if (filter?.campaignId) where.campaignId = filter.campaignId;
    if (filter?.ownerManagerId) where.ownerManagerId = filter.ownerManagerId;
    if (filter?.ownerTeamLeadId) where.ownerTeamLeadId = filter.ownerTeamLeadId;
    if (filter?.assignedToUserIds) where.currentAssigneeUserId = { in: filter.assignedToUserIds };
    if (filter?.nextActionFrom || filter?.nextActionTo) {
      // Range predicates exclude null nextActionAt rows in SQL.
      where.nextActionAt = {
        ...(filter.nextActionFrom ? { gte: filter.nextActionFrom } : {}),
        ...(filter.nextActionTo ? { lte: filter.nextActionTo } : {}),
      };
    } else if (filter?.hasNextAction) {
      where.nextActionAt = { not: null };
    }
    if (filter?.currentAssignedAtFrom || filter?.currentAssignedAtTo) {
      where.assignments = {
        some: {
          unassignedAt: null,
          ...(filter.assignedToUserIds
            ? { assignedToUserId: { in: filter.assignedToUserIds } }
            : {}),
          assignedAt: {
            ...(filter.currentAssignedAtFrom ? { gte: filter.currentAssignedAtFrom } : {}),
            ...(filter.currentAssignedAtTo ? { lte: filter.currentAssignedAtTo } : {}),
          },
        },
      };
    }

    const and: Prisma.LeadWhereInput[] = [];

    const phoneSnapshots = (filter?.phoneSnapshots ?? []).map((p) => p.trim()).filter(Boolean);
    const emailSnapshots = (filter?.emailSnapshots ?? [])
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (phoneSnapshots.length > 0 || emailSnapshots.length > 0) {
      const contactOr: Prisma.LeadWhereInput[] = [];
      if (phoneSnapshots.length > 0) {
        contactOr.push({ phoneSnapshot: { in: phoneSnapshots } });
      }
      if (emailSnapshots.length > 0) {
        contactOr.push({
          OR: emailSnapshots.map((email) => ({
            emailSnapshot: { equals: email, mode: "insensitive" as const },
          })),
        });
      }
      and.push({ OR: contactOr });
    }

    if (filter?.teamLeadCustomerScope) {
      const { teamLeadId, callerUserIds } = filter.teamLeadCustomerScope;
      and.push({
        OR: [
          { ownerTeamLeadId: teamLeadId },
          {
            campaignId: { not: null },
            currentAssigneeUserId: { in: callerUserIds },
          },
        ],
      });
    }

    if (filter?.search) {
      const q = filter.search.trim();
      const searchOr: Prisma.LeadWhereInput[] = [
        { fullNameSnapshot: { contains: q, mode: "insensitive" } },
        { phoneSnapshot: { contains: q, mode: "insensitive" } },
        { emailSnapshot: { contains: q, mode: "insensitive" } },
      ];
      if (filter.searchableCustomKeys && filter.searchableCustomKeys.length > 0) {
        searchOr.push({
          customFieldValues: {
            some: {
              customFieldDefinition: {
                organizationId,
                internalKey: { in: filter.searchableCustomKeys },
                isSearchable: true,
                status: "ACTIVE",
              },
              OR: [
                { valueText: { contains: q, mode: "insensitive" } },
                { valueSelectOption: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        });
      }
      and.push({ OR: searchOr });
    }

    if (filter?.fieldFilters) {
      for (const [key, raw] of Object.entries(filter.fieldFilters)) {
        const value = raw.trim();
        if (!value) continue;
        if (key === "full_name") {
          and.push({ fullNameSnapshot: { contains: value, mode: "insensitive" } });
        } else if (key === "phone") {
          and.push({ phoneSnapshot: { contains: value, mode: "insensitive" } });
        } else if (key === "email") {
          and.push({ emailSnapshot: { contains: value, mode: "insensitive" } });
        } else {
          and.push({
            customFieldValues: {
              some: {
                customFieldDefinition: {
                  organizationId,
                  internalKey: key,
                  isFilterable: true,
                  status: "ACTIVE",
                },
                OR: [
                  { valueText: { contains: value, mode: "insensitive" } },
                  { valueSelectOption: { contains: value, mode: "insensitive" } },
                ],
              },
            },
          });
        }
      }
    }

    if (and.length > 0) {
      where.AND = and;
    }
    return where;
  }

  async createWithAudit(
    data: CreateLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    const [lead] = await this.createManyWithAudit([data], actor, correlationId);
    return lead!;
  }

  async createManyWithAudit(
    items: CreateLeadData[],
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead[]> {
    if (items.length === 0) return [];

    const CHUNK = 200;
    const created: Lead[] = [];

    for (let offset = 0; offset < items.length; offset += CHUNK) {
      const chunk = items.slice(offset, offset + CHUNK);
      const chunkLeads = await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        const leadRows = chunk.map((data) => {
          const id = crypto.randomUUID();
          return {
            id,
            organizationId: data.organizationId,
            customerId: data.customerId,
            leadSourceId: data.leadSourceId,
            currentStageId: data.currentStageId,
            campaignId: data.campaignId ?? null,
            ownerManagerId: data.ownerManagerId ?? null,
            ownerTeamLeadId: data.ownerTeamLeadId ?? null,
            fullNameSnapshot: data.fullNameSnapshot,
            phoneSnapshot: data.phoneSnapshot ?? null,
            emailSnapshot: data.emailSnapshot ?? null,
            currentAssigneeUserId: data.initialAssignment?.assignedToUserId ?? null,
            createdAt: now,
            updatedAt: now,
            initialAssignment: data.initialAssignment ?? null,
          };
        });

        await tx.lead.createMany({
          data: leadRows.map(
            ({
              id,
              organizationId,
              customerId,
              leadSourceId,
              currentStageId,
              campaignId,
              ownerManagerId,
              ownerTeamLeadId,
              fullNameSnapshot,
              phoneSnapshot,
              emailSnapshot,
              currentAssigneeUserId,
              createdAt,
              updatedAt,
            }) => ({
              id,
              organizationId,
              customerId,
              leadSourceId,
              currentStageId,
              campaignId,
              ownerManagerId,
              ownerTeamLeadId,
              fullNameSnapshot,
              phoneSnapshot,
              emailSnapshot,
              currentAssigneeUserId,
              createdAt,
              updatedAt,
            }),
          ),
        });

        const assignments = leadRows
          .filter((row) => row.initialAssignment)
          .map((row) => ({
            leadId: row.id,
            assignedToUserId: row.initialAssignment!.assignedToUserId,
            assignedByUserId: row.initialAssignment!.assignedByUserId,
            assignmentType: row.initialAssignment!.assignmentType,
          }));
        if (assignments.length > 0) {
          await tx.leadAssignment.createMany({ data: assignments });
        }

        const leads: Lead[] = leadRows.map((row) => ({
          id: row.id,
          organizationId: row.organizationId,
          customerId: row.customerId,
          leadSourceId: row.leadSourceId,
          currentStageId: row.currentStageId,
          lostReasonId: null,
          campaignId: row.campaignId,
          currentAssigneeUserId: row.currentAssigneeUserId,
          ownerManagerId: row.ownerManagerId,
          ownerTeamLeadId: row.ownerTeamLeadId,
          fullNameSnapshot: row.fullNameSnapshot,
          phoneSnapshot: row.phoneSnapshot,
          emailSnapshot: row.emailSnapshot,
          nextActionAt: null,
          nextActionType: null,
          wonAt: null,
          lostAt: null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));

        await tx.leadAuditLog.createMany({
          data: leads.map((lead) => ({
            organizationId: lead.organizationId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            action: "LeadCreated",
            targetType: TARGET_TYPE_LEAD,
            targetId: lead.id,
            correlationId: correlationId ?? null,
            beforeState: undefined,
            afterState: toAuditJson(lead),
            recordHash: PLACEHOLDER_RECORD_HASH,
          })),
        });

        return leads;
      });

      created.push(...chunkLeads);
    }

    return created;
  }

  async updateWithAudit(
    id: string,
    data: UpdateLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.lead.findUniqueOrThrow({ where: { id } });
      const before = toLead(beforeRow);

      const afterRow = await tx.lead.update({
        where: { id },
        data: {
          leadSourceId: data.leadSourceId,
          fullNameSnapshot: data.fullNameSnapshot,
          phoneSnapshot: data.phoneSnapshot,
          emailSnapshot: data.emailSnapshot,
        },
      });
      const after = toLead(afterRow);

      await tx.leadAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LeadUpdated",
          targetType: TARGET_TYPE_LEAD,
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

  async changeStageWithAudit(
    id: string,
    data: ChangeLeadStageData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.lead.findUniqueOrThrow({ where: { id } });
      const before = toLead(beforeRow);

      const afterRow = await tx.lead.update({
        where: { id },
        data: {
          currentStageId: data.currentStageId,
          lostReasonId: data.lostReasonId,
          wonAt: data.wonAt,
          lostAt: data.lostAt,
        },
      });
      const after = toLead(afterRow);

      await tx.leadAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "LeadStageChanged",
          targetType: TARGET_TYPE_LEAD,
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

  async assignWithAudit(
    id: string,
    data: AssignLeadData,
    actor: LeadAuditActor,
    correlationId?: string | null,
  ): Promise<Lead> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.lead.findUniqueOrThrow({ where: { id } });
      const before = toLead(beforeRow);

      await tx.leadAssignment.updateMany({
        where: { leadId: id, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });

      await tx.leadAssignment.create({
        data: {
          leadId: id,
          assignedToUserId: data.assignedToUserId,
          assignedByUserId: data.assignedByUserId,
          assignmentType: data.assignmentType,
          campaignAssignmentId: data.campaignAssignmentId ?? null,
        },
      });

      const afterRow = await tx.lead.update({
        where: { id },
        data: {
          currentAssigneeUserId: data.assignedToUserId,
          ...(data.ownership
            ? {
                ownerManagerId: data.ownership.ownerManagerId,
                ownerTeamLeadId: data.ownership.ownerTeamLeadId,
              }
            : {}),
        },
      });
      const after = toLead(afterRow);

      await tx.leadAuditLog.create({
        data: {
          organizationId: after.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: data.assignmentType === "INITIAL" ? "LeadAssigned" : "LeadReassigned",
          targetType: TARGET_TYPE_LEAD,
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

  async listAssignmentHistory(leadId: string): Promise<LeadAssignment[]> {
    const rows = await this.prisma.leadAssignment.findMany({
      where: { leadId },
      orderBy: { assignedAt: "desc" },
    });
    return rows.map(toLeadAssignment);
  }

  async updateNextAction(
    leadId: string,
    nextActionAt: Date | null,
    nextActionType: string | null,
  ): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { nextActionAt, nextActionType },
    });
  }

  async listAuditLog(leadId: string): Promise<LeadAuditRecord[]> {
    const rows = await this.prisma.leadAuditLog.findMany({
      where: { targetType: TARGET_TYPE_LEAD, targetId: leadId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(toLeadAuditRecord);
  }

  async listRecentAuditLog(organizationId: string, limit: number): Promise<LeadAuditRecord[]> {
    const rows = await this.prisma.leadAuditLog.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map(toLeadAuditRecord);
  }

  async hardDeleteLeadsWithCustomers(
    organizationId: string,
    leadIds: string[],
  ): Promise<{
    deletedLeadIds: string[];
    deletedCustomerIds: string[];
    failed: Array<{ leadId: string; error: string }>;
  }> {
    const uniqueIds = [...new Set(leadIds)];
    const deletedLeadIds: string[] = [];
    const deletedCustomerIds: string[] = [];
    const failed: Array<{ leadId: string; error: string }> = [];
    const customerIdsToMaybeDelete = new Set<string>();

    for (const leadId of uniqueIds) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const lead = await tx.lead.findFirst({
            where: { id: leadId, organizationId },
            select: { id: true, customerId: true },
          });
          if (!lead) {
            throw new Error("Lead was not found.");
          }

          const loanApps = await tx.loanApplication.count({ where: { leadId } });
          if (loanApps > 0) {
            throw new Error("linked loan application(s) exist");
          }

          const followUps = await tx.followUp.findMany({
            where: { leadId },
            select: { id: true },
          });
          const followUpIds = followUps.map((row) => row.id);
          if (followUpIds.length > 0) {
            await tx.followUpReassignment.deleteMany({
              where: { followUpId: { in: followUpIds } },
            });
            await tx.followUp.deleteMany({ where: { id: { in: followUpIds } } });
          }

          await tx.callAttempt.updateMany({
            where: { leadId },
            data: { leadId: null },
          });

          // Dialer queue rows reference Lead by UUID without cascade.
          await tx.dialerQueueEntry.deleteMany({ where: { leadId } });

          await tx.lead.delete({ where: { id: leadId } });
          customerIdsToMaybeDelete.add(lead.customerId);
          deletedLeadIds.push(leadId);
        });
      } catch (error) {
        failed.push({
          leadId,
          error: error instanceof Error ? error.message : "Delete failed",
        });
      }
    }

    for (const customerId of customerIdsToMaybeDelete) {
      try {
        const remainingLeads = await this.prisma.lead.count({ where: { customerId } });
        if (remainingLeads > 0) continue;

        const [loanApps, loanAccounts, merges] = await Promise.all([
          this.prisma.loanApplication.count({ where: { customerId } }),
          this.prisma.loanAccount.count({ where: { customerId } }),
          this.prisma.customerMerge.count({
            where: {
              OR: [{ survivingCustomerId: customerId }, { mergedAwayCustomerId: customerId }],
            },
          }),
        ]);
        if (loanApps > 0 || loanAccounts > 0 || merges > 0) continue;

        await this.prisma.customer.delete({ where: { id: customerId } });
        deletedCustomerIds.push(customerId);
      } catch {
        // Customer may be referenced elsewhere — leave it; leads were already removed.
      }
    }

    return { deletedLeadIds, deletedCustomerIds, failed };
  }
}
