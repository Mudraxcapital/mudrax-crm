// ============================================================================
// src/modules/reports/infrastructure/adapters/SourceModulesDataAdapter.ts
//
// Consumes public APIs of upstream modules for live KPIs and tabular report
// rows. One-directional: reports never writes into those modules.
// ============================================================================

import { countCustomers, listCustomers } from "@/modules/customers";
import { getCampaignStatistics, listCampaigns } from "@/modules/campaigns";
import { getDocumentsDashboard, listDocuments } from "@/modules/documents";
import {
  countLeads,
  countLeadsByCampaign,
  getLeadsBySource,
  getLeadsByStage,
  listDistinctCustomerIds,
  listLeads,
} from "@/modules/leads";
import { countFollowUps, OPEN_FOLLOW_UP_STATUSES } from "@/modules/follow-ups";
import { getNotificationsDashboard, listNotifications } from "@/modules/notifications";
import { getTelephonyDashboard, listCallAttempts } from "@/modules/telephony";
import { listUsers } from "@/modules/users";
import type { ReportFilter } from "../../domain/entities/ReportFilter";
import type { ReportType } from "../../domain/entities/ReportType";
import { InvalidReportTypeError } from "../../domain/errors/ReportErrors";
import type {
  AnalyticsKpis,
  ReportResult,
  ReportRow,
  SourceDataPort,
} from "../../application/ports/SourceDataPort";
import {
  buildConversionFunnel,
  buildLeadTrend,
  buildSourceConversions,
  buildTopPerformingUsers,
  countInLastDays,
  isSameUtcDay,
  resolveTrendGranularity,
} from "./analyticsAggregates";

function inDateRange(iso: string, filter: ReportFilter): boolean {
  const value = new Date(iso).getTime();
  if (Number.isNaN(value)) return true;
  if (filter.dateFrom) {
    const from = new Date(filter.dateFrom).getTime();
    if (!Number.isNaN(from) && value < from) return false;
  }
  if (filter.dateTo) {
    const to = new Date(filter.dateTo).getTime();
    if (!Number.isNaN(to) && value > to) return false;
  }
  return true;
}

function matchesUserScope(userId: string | null | undefined, filter: ReportFilter): boolean {
  if (!filter.userId) return true;
  return userId === filter.userId;
}

function agentScopeFromFilter(filter?: ReportFilter): {
  agentUserId?: string;
  agentUserIds?: string[];
} {
  if (filter?.userId) return { agentUserId: filter.userId };
  if (filter?.agentUserIds?.length) return { agentUserIds: filter.agentUserIds };
  return {};
}

function isHierarchyScoped(filter?: ReportFilter): boolean {
  return Boolean(
    filter?.ownerManagerId ||
      filter?.ownerTeamLeadId ||
      filter?.agentUserIds?.length ||
      filter?.userId,
  );
}

export class SourceModulesDataAdapter implements SourceDataPort {
  async getAnalyticsKpis(organizationId: string, filter?: ReportFilter): Promise<AnalyticsKpis> {
    const ownerManagerId = filter?.ownerManagerId ?? undefined;
    // Lead ownership columns only — do NOT AND agentUserIds as assignees or
    // unassigned / team-owned leads disappear from Reports.
    const leadScope = {
      ownerManagerId,
      ownerTeamLeadId: filter?.ownerTeamLeadId ?? undefined,
      assignedToUserIds: filter?.userId ? [filter.userId] : undefined,
    };
    const agentScope = agentScopeFromFilter(filter);
    const followUpScope = filter?.userId
      ? { assignedToUserIds: [filter.userId] }
      : filter?.agentUserIds?.length
        ? { assignedToUserIds: filter.agentUserIds }
        : {};
    const scoped = isHierarchyScoped(filter);
    const now = new Date();
    const dateFrom = filter?.dateFrom ? new Date(filter.dateFrom) : null;
    const dateTo = filter?.dateTo ? new Date(filter.dateTo) : now;
    const safeDateFrom =
      dateFrom && !Number.isNaN(dateFrom.getTime()) ? dateFrom : null;
    const safeDateTo = !Number.isNaN(dateTo.getTime()) ? dateTo : now;
    const granularity = resolveTrendGranularity(safeDateFrom, safeDateTo);

    const [
      totalCustomers,
      totalLeads,
      leadsByStage,
      leadsBySource,
      campaigns,
      campaignLeadCounts,
      telephony,
      documentsDashboard,
      notifications,
      followUpsCompleted,
      followUpsPendingCounts,
      leads,
      users,
    ] = await Promise.all([
      filter?.ownerTeamLeadId
        ? listDistinctCustomerIds(organizationId, {
            ownerManagerId,
            teamLeadCustomerScope: {
              teamLeadId: filter.ownerTeamLeadId,
              callerUserIds: filter.agentUserIds?.length
                ? filter.agentUserIds
                : [filter.ownerTeamLeadId],
            },
          }).then((ids) => ids.length)
        : countCustomers(organizationId, ownerManagerId ? { ownerManagerId } : undefined),
      countLeads(organizationId, leadScope),
      getLeadsByStage(organizationId, leadScope),
      getLeadsBySource(organizationId, leadScope),
      listCampaigns(organizationId, ownerManagerId ? { ownerManagerId } : undefined),
      countLeadsByCampaign(organizationId, leadScope),
      getTelephonyDashboard(organizationId, now, agentScope),
      scoped
        ? Promise.resolve({
            totalDocuments: 0,
            pendingVerification: 0,
          })
        : getDocumentsDashboard(organizationId),
      scoped
        ? Promise.resolve({ sent: 0, failed: 0 })
        : getNotificationsDashboard(organizationId),
      countFollowUps(organizationId, { status: "COMPLETED", ...followUpScope }),
      Promise.all(
        OPEN_FOLLOW_UP_STATUSES.map((status) =>
          countFollowUps(organizationId, { status, ...followUpScope }),
        ),
      ),
      listLeads(organizationId, { ...leadScope, limit: 5_000 }),
      listUsers({
        limit: 5_000,
        userIds: filter?.agentUserIds?.length ? filter.agentUserIds : undefined,
      }),
    ]);

    const campaignNameById = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));
    const campaignPerformance = campaignLeadCounts
      .map((entry) => ({
        key: entry.campaignId,
        label: campaignNameById.get(entry.campaignId) ?? entry.campaignId.slice(0, 8),
        count: entry.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const leadsByStatus = leadsByStage.map((entry) => ({
      key: entry.stageId,
      label: `${entry.stageName} (${entry.bucket})`,
      count: entry.count,
    }));

    const userNames = new Map(users.map((user) => [user.id, user.fullName]));
    const followUpsPending = followUpsPendingCounts.reduce((sum, count) => sum + count, 0);

    const todayCreated = leads.filter((lead) => isSameUtcDay(lead.createdAt, now)).length;
    const todayConversions = leads.filter((lead) => isSameUtcDay(lead.wonAt, now)).length;
    const todayConversionRate = todayCreated === 0 ? 0 : todayConversions / todayCreated;

    return {
      totalCustomers,
      totalLeads,
      leadsByStatus,
      leadsBySource: leadsBySource.map((entry) => ({
        key: entry.sourceId,
        label: entry.sourceName,
        count: entry.count,
      })),
      campaignPerformance,
      callsToday: telephony.callsToday,
      connectedCalls: telephony.connectedCallsToday,
      missedCalls: telephony.missedCallsToday,
      documentsUploaded: documentsDashboard.totalDocuments,
      pendingDocumentVerification: documentsDashboard.pendingVerification,
      notificationsSent: notifications.sent,
      failedNotifications: notifications.failed,
      conversionFunnel: buildConversionFunnel(leadsByStatus),
      leadTrend: buildLeadTrend(leads, safeDateFrom, safeDateTo, granularity),
      leadTrendGranularity: granularity,
      topPerformingUsers: buildTopPerformingUsers(leads, userNames),
      topCampaigns: campaignPerformance.slice(0, 10),
      followUpCompletion: [
        { key: "completed", label: "Completed", count: followUpsCompleted },
        { key: "pending", label: "Pending", count: followUpsPending },
      ],
      sourceConversions: buildSourceConversions(leads),
      todayConversions,
      todayConversionRate,
      weekLeadCount: countInLastDays(leads, "createdAt", 7, now),
      weekConversions: countInLastDays(leads, "wonAt", 7, now),
    };
  }

  async getReportRows(
    organizationId: string,
    reportType: ReportType,
    filter: ReportFilter,
  ): Promise<ReportResult> {
    switch (reportType) {
      case "CUSTOMER":
        return this.customerReport(organizationId, filter);
      case "LEAD":
        return this.leadReport(organizationId, filter);
      case "CAMPAIGN":
        return this.campaignReport(organizationId, filter);
      case "TELEPHONY":
        return this.telephonyReport(organizationId, filter);
      case "DOCUMENT":
        return this.documentReport(organizationId, filter);
      case "NOTIFICATION":
        return this.notificationReport(organizationId, filter);
      default:
        throw new InvalidReportTypeError(reportType);
    }
  }

  private async customerReport(organizationId: string, filter: ReportFilter): Promise<ReportResult> {
    const customers = filter.ownerTeamLeadId
      ? await listDistinctCustomerIds(organizationId, {
          ownerManagerId: filter.ownerManagerId ?? undefined,
          teamLeadCustomerScope: {
            teamLeadId: filter.ownerTeamLeadId,
            callerUserIds: filter.agentUserIds?.length
              ? filter.agentUserIds
              : [filter.ownerTeamLeadId],
          },
        }).then(async (ids) =>
          ids.length > 0
            ? listCustomers(organizationId, { customerIds: ids, limit: 500 })
            : [],
        )
      : await listCustomers(organizationId, {
          limit: 500,
          ownerManagerId: filter.ownerManagerId ?? undefined,
        });
    const columns = ["id", "fullName", "status", "identityConfidence", "createdAt"];
    const rows: ReportRow[] = customers
      .filter((customer) => inDateRange(customer.createdAt, filter))
      .map((customer) => ({
        id: customer.id,
        fullName: customer.fullName,
        status: customer.status,
        identityConfidence: customer.identityConfidence,
        createdAt: customer.createdAt,
      }));
    return { reportType: "CUSTOMER", columns, rows, generatedAt: new Date().toISOString() };
  }

  private async leadReport(organizationId: string, filter: ReportFilter): Promise<ReportResult> {
    const leads = await listLeads(organizationId, {
      // Prefer ownership scope; assignee only when an explicit user filter is set.
      assignedToUserIds: filter.userId ? [filter.userId] : undefined,
      ownerManagerId: filter.ownerManagerId ?? undefined,
      ownerTeamLeadId: filter.ownerTeamLeadId ?? undefined,
      limit: 500,
    });
    const columns = [
      "id",
      "fullName",
      "stage",
      "source",
      "campaignId",
      "assigneeUserId",
      "createdAt",
    ];
    const rows: ReportRow[] = leads
      .filter((lead) => inDateRange(lead.createdAt, filter))
      .map((lead) => ({
        id: lead.id,
        fullName: lead.fullNameSnapshot,
        stage: lead.currentStageName,
        source: lead.leadSourceName,
        campaignId: lead.campaignId,
        assigneeUserId: lead.currentAssigneeUserId,
        createdAt: lead.createdAt,
      }));
    return { reportType: "LEAD", columns, rows, generatedAt: new Date().toISOString() };
  }

  private async campaignReport(organizationId: string, filter: ReportFilter): Promise<ReportResult> {
    const campaigns = await listCampaigns(
      organizationId,
      filter.ownerManagerId ? { ownerManagerId: filter.ownerManagerId } : undefined,
    );
    const columns = [
      "id",
      "name",
      "status",
      "memberCount",
      "totalLeadsAllocated",
      "startDate",
      "endDate",
      "createdAt",
    ];
    const rows: ReportRow[] = [];
    for (const campaign of campaigns) {
      if (!inDateRange(campaign.createdAt, filter)) continue;
      if (!matchesUserScope(campaign.createdByUserId, filter)) continue;
      const stats = await getCampaignStatistics(campaign.id);
      rows.push({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        memberCount: stats.memberCount,
        totalLeadsAllocated: stats.totalLeadsAllocated,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        createdAt: campaign.createdAt,
      });
    }
    return { reportType: "CAMPAIGN", columns, rows, generatedAt: new Date().toISOString() };
  }

  private async telephonyReport(
    organizationId: string,
    filter: ReportFilter,
  ): Promise<ReportResult> {
    const calls = await listCallAttempts(organizationId, {
      agentUserId: filter.userId ?? undefined,
      agentUserIds: !filter.userId && filter.agentUserIds?.length ? filter.agentUserIds : undefined,
      initiatedFrom: filter.dateFrom ? new Date(filter.dateFrom) : undefined,
      initiatedTo: filter.dateTo ? new Date(filter.dateTo) : undefined,
      limit: 500,
    });
    const columns = [
      "id",
      "direction",
      "status",
      "disposition",
      "agentUserId",
      "durationSeconds",
      "createdAt",
    ];
    const rows: ReportRow[] = calls.map((call) => ({
      id: call.id,
      direction: call.direction,
      status: call.status,
      disposition: call.disposition,
      agentUserId: call.agentUserId,
      durationSeconds: call.durationSeconds,
      createdAt: call.createdAt,
    }));
    return { reportType: "TELEPHONY", columns, rows, generatedAt: new Date().toISOString() };
  }

  private async documentReport(organizationId: string, filter: ReportFilter): Promise<ReportResult> {
    const documents = await listDocuments(organizationId, { limit: 500 });
    const columns = [
      "id",
      "documentType",
      "ownerType",
      "ownerId",
      "status",
      "createdByUserId",
      "createdAt",
    ];
    const rows: ReportRow[] = documents
      .filter((document) => inDateRange(document.createdAt, filter))
      .filter((document) => matchesUserScope(document.createdByUserId, filter))
      .map((document) => ({
        id: document.id,
        documentType: document.documentTypeName ?? document.documentTypeId,
        ownerType: document.ownerType,
        ownerId: document.ownerId,
        status: document.status,
        createdByUserId: document.createdByUserId,
        createdAt: document.createdAt,
      }));
    return { reportType: "DOCUMENT", columns, rows, generatedAt: new Date().toISOString() };
  }

  private async notificationReport(
    organizationId: string,
    filter: ReportFilter,
  ): Promise<ReportResult> {
    const notifications = await listNotifications(organizationId, { limit: 500 });
    const columns = [
      "id",
      "category",
      "channelType",
      "status",
      "recipientType",
      "recipientId",
      "createdAt",
    ];
    const rows: ReportRow[] = notifications
      .filter((notification) => inDateRange(notification.createdAt, filter))
      .map((notification) => ({
        id: notification.id,
        category: notification.category,
        channelType: notification.channelType,
        status: notification.status,
        recipientType: notification.recipientType,
        recipientId: notification.recipientId,
        createdAt: notification.createdAt,
      }));

    return { reportType: "NOTIFICATION", columns, rows, generatedAt: new Date().toISOString() };
  }
}
