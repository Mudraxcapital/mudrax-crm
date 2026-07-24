// ============================================================================
// prisma/seed/steps/15-reports-catalogs.ts
//
// Seeds Report Templates (one per report type), Metric Definitions + KPIs
// for the Analytics Dashboard, and a sample Executive Dashboard.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

const REPORT_TEMPLATES: {
  name: string;
  reportType:
    | "CUSTOMER"
    | "LEAD"
    | "CAMPAIGN"
    | "TELEPHONY"
    | "DOCUMENT"
    | "NOTIFICATION";
  fields: string[];
}[] = [
  {
    name: "Customer Report",
    reportType: "CUSTOMER",
    fields: ["id", "fullName", "status", "identityConfidence", "createdAt"],
  },
  {
    name: "Lead Report",
    reportType: "LEAD",
    fields: ["id", "fullName", "stage", "source", "campaignId", "assigneeUserId", "createdAt"],
  },
  {
    name: "Campaign Report",
    reportType: "CAMPAIGN",
    fields: [
      "id",
      "name",
      "status",
      "memberCount",
      "totalLeadsAllocated",
      "startDate",
      "endDate",
      "createdAt",
    ],
  },
  {
    name: "Telephony Report",
    reportType: "TELEPHONY",
    fields: [
      "id",
      "direction",
      "status",
      "disposition",
      "agentUserId",
      "durationSeconds",
      "createdAt",
    ],
  },
  {
    name: "Documents Report",
    reportType: "DOCUMENT",
    fields: [
      "id",
      "documentType",
      "ownerType",
      "ownerId",
      "status",
      "createdByUserId",
      "createdAt",
    ],
  },
  {
    name: "Notifications Report",
    reportType: "NOTIFICATION",
    fields: [
      "id",
      "category",
      "channelType",
      "status",
      "recipientType",
      "recipientId",
      "createdAt",
    ],
  },
];

const KPI_DEFS: {
  metricName: string;
  kpiName: string;
  domain: "LEAD" | "TELEPHONY" | "DOCUMENT" | "ORGANIZATION" | "AUDIT";
  aggregationFunction: string;
}[] = [
  {
    metricName: "metric.total_customers",
    kpiName: "Total Customers",
    domain: "ORGANIZATION",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.total_leads",
    kpiName: "Total Leads",
    domain: "LEAD",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.calls_today",
    kpiName: "Calls Today",
    domain: "TELEPHONY",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.connected_calls",
    kpiName: "Connected Calls",
    domain: "TELEPHONY",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.missed_calls",
    kpiName: "Missed Calls",
    domain: "TELEPHONY",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.documents_uploaded",
    kpiName: "Documents Uploaded",
    domain: "DOCUMENT",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.pending_document_verification",
    kpiName: "Pending Document Verification",
    domain: "DOCUMENT",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.notifications_sent",
    kpiName: "Notifications Sent",
    domain: "ORGANIZATION",
    aggregationFunction: "COUNT",
  },
  {
    metricName: "metric.failed_notifications",
    kpiName: "Failed Notifications",
    domain: "ORGANIZATION",
    aggregationFunction: "COUNT",
  },
];

export async function seedReportsCatalogs(
  prisma: PrismaClient,
  organizationId: string,
  adminUserId: string,
): Promise<void> {
  section("15. Reports module catalogs (Templates, KPIs, Executive Dashboard)");

  explain(
    "Six PUBLISHED Report Templates, live Metric Definitions + KPIs for the Analytics Dashboard, and one Executive Dashboard with KPI widgets.",
  );

  for (const templateDef of REPORT_TEMPLATES) {
    const existing = await prisma.reportTemplate.findFirst({
      where: {
        organizationId,
        name: templateDef.name,
        versionNumber: 1,
      },
    });
    if (existing) {
      await prisma.reportTemplate.update({
        where: { id: existing.id },
        data: {
          status: "PUBLISHED",
          columns: {
            reportType: templateDef.reportType,
            fields: templateDef.fields,
          },
        },
      });
    } else {
      await prisma.reportTemplate.create({
        data: {
          organizationId,
          name: templateDef.name,
          versionNumber: 1,
          status: "PUBLISHED",
          columns: {
            reportType: templateDef.reportType,
            fields: templateDef.fields,
          },
        },
      });
    }
  }

  const kpiIds: string[] = [];
  for (const def of KPI_DEFS) {
    const metric = await prisma.metricDefinition.upsert({
      where: {
        organizationId_name: { organizationId, name: def.metricName },
      },
      update: {
        domain: def.domain,
        aggregationFunction: def.aggregationFunction,
        freshnessPolicy: "REAL_TIME",
        status: "PUBLISHED",
        dimensions: {},
      },
      create: {
        organizationId,
        name: def.metricName,
        domain: def.domain,
        aggregationFunction: def.aggregationFunction,
        freshnessPolicy: "REAL_TIME",
        status: "PUBLISHED",
        dimensions: {},
      },
    });

    const kpi = await prisma.kpi.upsert({
      where: {
        organizationId_name: { organizationId, name: def.kpiName },
      },
      update: {
        metricDefinitionId: metric.id,
        status: "ACTIVE",
      },
      create: {
        organizationId,
        metricDefinitionId: metric.id,
        name: def.kpiName,
        status: "ACTIVE",
      },
    });
    kpiIds.push(kpi.id);
  }

  const existingDashboard = await prisma.dashboard.findFirst({
    where: { organizationId, name: "Executive Analytics" },
  });

  if (!existingDashboard) {
    await prisma.dashboard.create({
      data: {
        organizationId,
        name: "Executive Analytics",
        audience: "EXECUTIVE",
        ownerUserId: adminUserId,
        status: "PUBLISHED",
        widgets: {
          create: kpiIds.map((kpiId, index) => ({
            visualizationType: "counter",
            kpiId,
            reportFilter: {
              dateFrom: null,
              dateTo: null,
              branchId: null,
              departmentId: null,
              teamId: null,
              userId: null,
              kpiKey: KPI_DEFS[index]?.kpiName ?? null,
            },
            sortOrder: index,
            status: "ACTIVE",
          })),
        },
      },
    });
  }

  summary("Report Templates", REPORT_TEMPLATES.length);
  summary("KPIs", KPI_DEFS.length);
  summary("Executive Dashboard", 1);
}
