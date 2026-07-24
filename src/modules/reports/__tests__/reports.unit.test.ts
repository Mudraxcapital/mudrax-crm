import { beforeEach, describe, expect, it } from "vitest";
import { makeCreateDashboard } from "../application/use-cases/createDashboard";
import { makeDeleteSavedReport } from "../application/use-cases/deleteSavedReport";
import { makeExportReport } from "../application/use-cases/exportReport";
import { makeGetAnalyticsDashboard } from "../application/use-cases/getAnalyticsDashboard";
import { makeRerunSavedReport } from "../application/use-cases/rerunSavedReport";
import { makeRunReport } from "../application/use-cases/runReport";
import { makeSaveReport } from "../application/use-cases/saveReport";
import { renderCsv } from "../application/export/csvExporter";
import { renderPdf } from "../application/export/pdfExporter";
import {
  FakeDashboardRepository,
  FakeExportJobRepository,
  FakeKpiRepository,
  FakeReportExecutionRepository,
  FakeReportTemplateRepository,
  FakeSavedReportRepository,
  FakeSourceDataPort,
} from "./fakeReportRepositories";

const ORG_ID = "00000000-0000-0000-0001-000000000000";
const USER_ID = "00000000-0000-0000-0002-000000000000";
const ACTOR = { actorType: "USER" as const, actorId: USER_ID };

describe("Reports module use-cases", () => {
  let templates: FakeReportTemplateRepository;
  let saved: FakeSavedReportRepository;
  let executions: FakeReportExecutionRepository;
  let exports: FakeExportJobRepository;
  let dashboards: FakeDashboardRepository;
  let kpis: FakeKpiRepository;
  let source: FakeSourceDataPort;

  beforeEach(async () => {
    templates = new FakeReportTemplateRepository();
    saved = new FakeSavedReportRepository();
    executions = new FakeReportExecutionRepository();
    exports = new FakeExportJobRepository();
    dashboards = new FakeDashboardRepository();
    kpis = new FakeKpiRepository();
    source = new FakeSourceDataPort();

    await templates.createWithAudit(
      {
        organizationId: ORG_ID,
        name: "Customer Report",
        columns: {
          reportType: "CUSTOMER",
          fields: ["id", "name"],
        },
        status: "PUBLISHED",
      },
      ACTOR,
    );

    await kpis.upsertWithAudit(
      {
        organizationId: ORG_ID,
        metricDefinitionId: "00000000-0000-0000-0003-000000000000",
        name: "Total Customers",
        status: "ACTIVE",
      },
      ACTOR,
    );
  });

  it("returns live analytics KPIs", async () => {
    const getDashboard = makeGetAnalyticsDashboard(source);
    const dashboard = await getDashboard(ORG_ID);
    expect(dashboard.totalCustomers).toBe(3);
    expect(dashboard.callsToday).toBe(4);
    expect(dashboard.notificationsSent).toBe(9);
  });

  it("runs a report, saves it, re-runs it, and exports CSV/PDF", async () => {
    const runReport = makeRunReport(templates, executions, source);
    const saveReport = makeSaveReport(templates, saved);
    const rerun = makeRerunSavedReport(saved, templates, runReport);
    const exportReport = makeExportReport(executions, templates, exports, source);

    const execution = await runReport({
      organizationId: ORG_ID,
      input: { reportType: "CUSTOMER", filter: {} },
      actor: ACTOR,
    });
    expect(execution.status).toBe("COMPLETED");
    expect(execution.result?.rows.length).toBeGreaterThan(0);

    const savedReport = await saveReport({
      organizationId: ORG_ID,
      ownerUserId: USER_ID,
      input: { name: "My Customers", reportType: "CUSTOMER", filter: {} },
      actor: ACTOR,
    });
    expect(savedReport.name).toBe("My Customers");

    const rerunExecution = await rerun({
      organizationId: ORG_ID,
      ownerUserId: USER_ID,
      savedReportId: savedReport.id,
      actor: ACTOR,
    });
    expect(rerunExecution.savedReportId).toBe(savedReport.id);

    const csv = await exportReport({
      organizationId: ORG_ID,
      input: { reportExecutionId: execution.id, format: "CSV" },
      actor: ACTOR,
    });
    expect(csv.job.status).toBe("COMPLETED");
    expect(csv.contentType).toContain("text/csv");
    expect(csv.body.toString("utf8")).toContain("id");

    const pdf = await exportReport({
      organizationId: ORG_ID,
      input: { reportExecutionId: execution.id, format: "PDF" },
      actor: ACTOR,
    });
    expect(pdf.job.status).toBe("COMPLETED");
    expect(pdf.body.toString("utf8").startsWith("%PDF")).toBe(true);

    const deleteSaved = makeDeleteSavedReport(saved);
    await deleteSaved({
      organizationId: ORG_ID,
      ownerUserId: USER_ID,
      savedReportId: savedReport.id,
      actor: ACTOR,
    });
    expect(await saved.findById(savedReport.id)).toBeNull();
  });

  it("creates a dashboard bound to an existing KPI", async () => {
    const createDashboard = makeCreateDashboard(dashboards, kpis);
    const dashboard = await createDashboard({
      organizationId: ORG_ID,
      ownerUserId: USER_ID,
      input: {
        name: "Exec",
        audience: "EXECUTIVE",
        widgets: [{ visualizationType: "counter", kpiName: "Total Customers" }],
      },
      actor: ACTOR,
    });
    expect(dashboard.widgets).toHaveLength(1);
    expect(dashboard.widgets[0]?.kpiId).toBeTruthy();
  });

  it("renders CSV and PDF exporters", () => {
    const result = {
      reportType: "LEAD" as const,
      columns: ["id", "name"],
      rows: [{ id: "1", name: "A, B" }],
      generatedAt: new Date().toISOString(),
    };
    expect(renderCsv(result)).toContain('"A, B"');
    expect(renderPdf(result)).toContain("%PDF");
  });
});
