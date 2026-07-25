import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("Reports module (integration)", () => {
  let prisma: (typeof import("@/infra/db/client"))["prisma"];
  let getAnalyticsDashboard: (typeof import("@/modules/reports"))["getAnalyticsDashboard"];
  let runReport: (typeof import("@/modules/reports"))["runReport"];
  let saveReport: (typeof import("@/modules/reports"))["saveReport"];
  let exportReport: (typeof import("@/modules/reports"))["exportReport"];
  let listReportTemplates: (typeof import("@/modules/reports"))["listReportTemplates"];
  let listDashboards: (typeof import("@/modules/reports"))["listDashboards"];

  let organizationId: string;
  let userId: string;

  beforeAll(async () => {
    const dbClient = await import("@/infra/db/client");
    const reportsModule = await import("@/modules/reports");
    prisma = dbClient.prisma;
    getAnalyticsDashboard = reportsModule.getAnalyticsDashboard;
    runReport = reportsModule.runReport;
    saveReport = reportsModule.saveReport;
    exportReport = reportsModule.exportReport;
    listReportTemplates = reportsModule.listReportTemplates;
    listDashboards = reportsModule.listDashboards;

    const organization = await prisma.organization.upsert({
      where: { code: "MUDRAX" },
      update: {},
      create: {
        name: "Mudrax Capitals",
        code: "MUDRAX",
        status: "ACTIVE",
        timezone: "Asia/Kolkata",
      },
    });
    organizationId = organization.id;

    const uniqueSuffix = Date.now().toString().slice(-6);
    const user = await prisma.user.create({
      data: {
        employeeId: `INTREP${uniqueSuffix}`,
        fullName: "Integration Test Reports User",
        email: `int-test-reports-${uniqueSuffix}@example.com`,
        passwordHash: "not-a-real-hash",
        status: "ACTIVE",
      },
    });
    userId = user.id;

    // Ensure Customer Report template exists for this org.
    const existing = await prisma.reportTemplate.findFirst({
      where: { organizationId, name: "Customer Report", versionNumber: 1 },
    });
    if (!existing) {
      await prisma.reportTemplate.create({
        data: {
          organizationId,
          name: "Customer Report",
          versionNumber: 1,
          status: "PUBLISHED",
          columns: {
            reportType: "CUSTOMER",
            fields: ["id", "fullName", "status", "identityConfidence", "createdAt"],
          },
        },
      });
    } else if (existing.status !== "PUBLISHED") {
      await prisma.reportTemplate.update({
        where: { id: existing.id },
        data: { status: "PUBLISHED" },
      });
    }
  });

  afterAll(async () => {
    // Leave seeded rows for inspection; integration tests are additive.
  });

  it("loads analytics KPIs from live upstream modules", async () => {
    const dashboard = await getAnalyticsDashboard(organizationId);
    expect(dashboard.totalCustomers).toBeGreaterThanOrEqual(0);
    expect(dashboard.totalLeads).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(dashboard.leadsByStatus)).toBe(true);
    expect(Array.isArray(dashboard.campaignPerformance)).toBe(true);
  });

  it("lists seeded report templates and runs a customer report with CSV/PDF export", async () => {
    const templates = await listReportTemplates(organizationId);
    expect(templates.some((template) => template.reportType === "CUSTOMER")).toBe(true);

    const execution = await runReport({
      organizationId,
      input: { reportType: "CUSTOMER", filter: {} },
      actor: { actorType: "USER", actorId: userId },
    });
    expect(execution.status).toBe("COMPLETED");
    expect(execution.result).toBeDefined();

    const saved = await saveReport({
      organizationId,
      ownerUserId: userId,
      input: {
        name: `Integration Customers ${Date.now()}`,
        reportType: "CUSTOMER",
        filter: {},
      },
      actor: { actorType: "USER", actorId: userId },
    });
    expect(saved.id).toBeTruthy();

    const csv = await exportReport({
      organizationId,
      input: { reportExecutionId: execution.id, format: "CSV" },
      actor: { actorType: "USER", actorId: userId },
    });
    expect(csv.job.status).toBe("COMPLETED");
    expect(csv.body.toString("utf8")).toContain("fullName");

    const pdf = await exportReport({
      organizationId,
      input: { reportExecutionId: execution.id, format: "PDF" },
      actor: { actorType: "USER", actorId: userId },
    });
    expect(pdf.body.toString("utf8").startsWith("%PDF")).toBe(true);
  });

  it("can list dashboards for the organization", async () => {
    const dashboards = await listDashboards(organizationId);
    expect(Array.isArray(dashboards)).toBe(true);
  });
});
