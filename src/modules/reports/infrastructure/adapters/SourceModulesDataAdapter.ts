// ============================================================================
// src/modules/reports/infrastructure/adapters/SourceModulesDataAdapter.ts
//
// Consumes public APIs of upstream modules for live KPIs and tabular report
// rows. One-directional: reports never writes into those modules.
// ============================================================================

import { countCustomers, listCustomers } from "@/modules/customers";
import { CAMPAIGN_STATUSES, getCampaignStatistics, listCampaigns } from "@/modules/campaigns";
import { getDocumentsDashboard, listDocuments } from "@/modules/documents";
import { countLeads, getLeadsBySource, getLeadsByStage, listLeads } from "@/modules/leads";
import { getNotificationsDashboard, listNotifications } from "@/modules/notifications";
import { getTelephonyDashboard, listCallAttempts } from "@/modules/telephony";
import type { ReportFilter } from "../../domain/entities/ReportFilter";
import type { ReportType } from "../../domain/entities/ReportType";
import { InvalidReportTypeError } from "../../domain/errors/ReportErrors";
import type {
  AnalyticsKpis,
  ReportResult,
  ReportRow,
  SourceDataPort,
} from "../../application/ports/SourceDataPort";

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

export class SourceModulesDataAdapter implements SourceDataPort {
  async getAnalyticsKpis(organizationId: string, filter?: ReportFilter): Promise<AnalyticsKpis> {
    void filter;
    const [
      totalCustomers,
      totalLeads,
      leadsByStage,
      leadsBySource,
      campaigns,
      telephony,
      documentsDashboard,
      notifications,
    ] = await Promise.all([
      countCustomers(organizationId),
      countLeads(organizationId),
      getLeadsByStage(organizationId),
      getLeadsBySource(organizationId),
      listCampaigns(organizationId),
      getTelephonyDashboard(organizationId),
      getDocumentsDashboard(organizationId),
      getNotificationsDashboard(organizationId),
    ]);

    const campaignPerformance =
      campaigns.length > 0
        ? await Promise.all(
            campaigns.slice(0, 20).map(async (campaign) => {
              const stats = await getCampaignStatistics(campaign.id);
              return {
                key: campaign.id,
                label: campaign.name,
                count: stats.totalLeadsAllocated,
              };
            }),
          )
        : CAMPAIGN_STATUSES.map((status) => ({
            key: status,
            label: status,
            count: campaigns.filter((campaign) => campaign.status === status).length,
          })).filter((entry) => entry.count > 0);

    return {
      totalCustomers,
      totalLeads,
      leadsByStatus: leadsByStage.map((entry) => ({
        key: entry.stageId,
        label: `${entry.stageName} (${entry.bucket})`,
        count: entry.count,
      })),
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
    const customers = await listCustomers(organizationId, { limit: 500 });
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
      assignedToUserIds: filter.userId ? [filter.userId] : undefined,
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
    const campaigns = await listCampaigns(organizationId);
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
