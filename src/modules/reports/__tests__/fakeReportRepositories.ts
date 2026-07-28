import { randomUUID } from "crypto";
import type { Dashboard } from "../domain/entities/Dashboard";
import type { ExportJob } from "../domain/entities/ExportJob";
import type { Kpi } from "../domain/entities/Kpi";
import type { MetricDefinition } from "../domain/entities/MetricDefinition";
import type { ReportExecution } from "../domain/entities/ReportExecution";
import type { ReportTemplate } from "../domain/entities/ReportTemplate";
import type { ReportType } from "../domain/entities/ReportType";
import type { SavedReport } from "../domain/entities/SavedReport";
import type {
  CreateDashboardData,
  DashboardRepository,
} from "../domain/repositories/DashboardRepository";
import type {
  CreateExportJobData,
  ExportJobRepository,
} from "../domain/repositories/ExportJobRepository";
import type {
  CreateKpiData,
  CreateMetricDefinitionData,
  KpiRepository,
  MetricDefinitionRepository,
} from "../domain/repositories/KpiRepository";
import type {
  CreateReportExecutionData,
  ReportExecutionRepository,
} from "../domain/repositories/ReportExecutionRepository";
import type {
  CreateReportTemplateData,
  ReportTemplateRepository,
} from "../domain/repositories/ReportTemplateRepository";
import type {
  CreateSavedReportData,
  SavedReportRepository,
} from "../domain/repositories/SavedReportRepository";
import type {
  AnalyticsKpis,
  ReportResult,
  SourceDataPort,
} from "../application/ports/SourceDataPort";
import type { ReportFilter } from "../domain/entities/ReportFilter";
import { emptyReportFilter } from "../domain/entities/ReportFilter";

export class FakeSourceDataPort implements SourceDataPort {
  kpis: AnalyticsKpis = {
    totalCustomers: 3,
    totalLeads: 5,
    leadsByStatus: [{ key: "s1", label: "New (INITIAL)", count: 2 }],
    leadsBySource: [{ key: "src1", label: "Web", count: 3 }],
    campaignPerformance: [{ key: "c1", label: "Q1 Dialer", count: 10 }],
    callsToday: 4,
    connectedCalls: 2,
    missedCalls: 1,
    documentsUploaded: 7,
    pendingDocumentVerification: 1,
    notificationsSent: 9,
    failedNotifications: 0,
    conversionFunnel: [
      { key: "fresh", label: "Fresh", count: 2 },
      { key: "contacted", label: "Contacted", count: 1 },
      { key: "interested", label: "Interested", count: 1 },
      { key: "documents", label: "Documents", count: 0 },
      { key: "approved", label: "Approved", count: 0 },
      { key: "disbursed", label: "Disbursed", count: 1 },
    ],
    leadTrend: [{ key: "2026-07-01", label: "2026-07-01", count: 2 }],
    leadTrendGranularity: "daily",
    topPerformingUsers: [{ key: "u1", label: "Alex", count: 3 }],
    topCampaigns: [{ key: "c1", label: "Q1 Dialer", count: 10 }],
    followUpCompletion: [
      { key: "completed", label: "Completed", count: 4 },
      { key: "pending", label: "Pending", count: 2 },
    ],
    sourceConversions: [{ key: "src1", label: "Web", count: 1 }],
    todayConversions: 1,
    todayConversionRate: 0.5,
    weekLeadCount: 3,
    weekConversions: 1,
  };

  rowsByType = new Map<ReportType, ReportResult>();

  async getAnalyticsKpis(): Promise<AnalyticsKpis> {
    return this.kpis;
  }

  async getReportRows(
    organizationId: string,
    reportType: ReportType,
    filter: ReportFilter,
  ): Promise<ReportResult> {
    void organizationId;
    void filter;
    return (
      this.rowsByType.get(reportType) ?? {
        reportType,
        columns: ["id", "name"],
        rows: [{ id: "1", name: "Sample" }],
        generatedAt: new Date().toISOString(),
      }
    );
  }
}

export class FakeReportTemplateRepository implements ReportTemplateRepository {
  templates = new Map<string, ReportTemplate>();

  async findById(id: string) {
    return this.templates.get(id) ?? null;
  }

  async findPublishedByType(organizationId: string, reportType: ReportType) {
    for (const template of this.templates.values()) {
      if (
        template.status === "PUBLISHED" &&
        template.columns.reportType === reportType &&
        (template.organizationId === organizationId || template.organizationId === null)
      ) {
        return template;
      }
    }
    return null;
  }

  async list(organizationId: string) {
    return [...this.templates.values()].filter(
      (template) =>
        template.organizationId === organizationId || template.organizationId === null,
    );
  }

  async createWithAudit(
    data: CreateReportTemplateData,
    actor?: unknown,
    correlationId?: string | null,
  ): Promise<ReportTemplate> {
    void actor;
    void correlationId;
    const now = new Date();
    const template: ReportTemplate = {
      id: randomUUID(),
      organizationId: data.organizationId,
      name: data.name,
      columns: data.columns,
      analyticsDatasetId: data.analyticsDatasetId ?? null,
      defaultGrouping: data.defaultGrouping ?? null,
      versionNumber: data.versionNumber ?? 1,
      status: data.status ?? "DRAFT",
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(template.id, template);
    return template;
  }
}

export class FakeSavedReportRepository implements SavedReportRepository {
  saved = new Map<string, SavedReport>();

  async findById(id: string) {
    return this.saved.get(id) ?? null;
  }

  async listByOwner(ownerUserId: string) {
    return [...this.saved.values()].filter(
      (item) => item.ownerUserId === ownerUserId && item.status !== "ARCHIVED",
    );
  }

  async createWithAudit(data: CreateSavedReportData): Promise<SavedReport> {
    const now = new Date();
    const item: SavedReport = {
      id: randomUUID(),
      ownerUserId: data.ownerUserId,
      reportTemplateId: data.reportTemplateId,
      name: data.name,
      filterConfig: data.filterConfig,
      status: data.status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    this.saved.set(item.id, item);
    return item;
  }

  async archiveWithAudit(id: string): Promise<SavedReport> {
    const item = this.saved.get(id)!;
    const updated = { ...item, status: "ARCHIVED" as const, updatedAt: new Date() };
    this.saved.set(id, updated);
    return updated;
  }

  async deleteWithAudit(id: string): Promise<void> {
    this.saved.delete(id);
  }
}

export class FakeReportExecutionRepository implements ReportExecutionRepository {
  executions = new Map<string, ReportExecution>();

  async findById(id: string) {
    return this.executions.get(id) ?? null;
  }

  async list(organizationId: string) {
    return [...this.executions.values()].filter((item) => item.organizationId === organizationId);
  }

  async createWithAudit(data: CreateReportExecutionData): Promise<ReportExecution> {
    const execution: ReportExecution = {
      id: randomUUID(),
      organizationId: data.organizationId,
      savedReportId: data.savedReportId ?? null,
      scheduledReportId: data.scheduledReportId ?? null,
      reportTemplateId: data.reportTemplateId,
      triggerType: data.triggerType,
      resolvedFilter: data.resolvedFilter,
      status: data.status ?? "QUEUED",
      startedAt: data.status === "RUNNING" ? new Date() : null,
      completedAt: null,
      failureReason: null,
      createdAt: new Date(),
    };
    this.executions.set(execution.id, execution);
    return execution;
  }

  async updateStatusWithAudit(
    id: string,
    status: ReportExecution["status"],
    _actor: unknown,
    options?: {
      startedAt?: Date | null;
      completedAt?: Date | null;
      failureReason?: string | null;
    },
  ): Promise<ReportExecution> {
    const current = this.executions.get(id)!;
    const updated: ReportExecution = {
      ...current,
      status,
      startedAt: options?.startedAt === undefined ? current.startedAt : options.startedAt,
      completedAt: options?.completedAt === undefined ? current.completedAt : options.completedAt,
      failureReason:
        options?.failureReason === undefined ? current.failureReason : options.failureReason,
    };
    this.executions.set(id, updated);
    return updated;
  }
}

export class FakeExportJobRepository implements ExportJobRepository {
  jobs = new Map<string, ExportJob>();

  async findById(id: string) {
    return this.jobs.get(id) ?? null;
  }

  async listByExecution(reportExecutionId: string) {
    return [...this.jobs.values()].filter((job) => job.reportExecutionId === reportExecutionId);
  }

  async createWithAudit(data: CreateExportJobData): Promise<ExportJob> {
    const now = new Date();
    const job: ExportJob = {
      id: randomUUID(),
      organizationId: data.organizationId,
      reportExecutionId: data.reportExecutionId,
      analyticsDatasetId: null,
      exportFormat: data.exportFormat,
      status: data.status ?? "QUEUED",
      resultAttachmentId: null,
      retryOfExportJobId: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  async updateStatusWithAudit(
    id: string,
    status: ExportJob["status"],
    _actor: unknown,
    options?: { failureReason?: string | null; resultAttachmentId?: string | null },
  ): Promise<ExportJob> {
    const current = this.jobs.get(id)!;
    const updated: ExportJob = {
      ...current,
      status,
      failureReason:
        options?.failureReason === undefined ? current.failureReason : options.failureReason,
      resultAttachmentId:
        options?.resultAttachmentId === undefined
          ? current.resultAttachmentId
          : options.resultAttachmentId,
      updatedAt: new Date(),
    };
    this.jobs.set(id, updated);
    return updated;
  }
}

export class FakeDashboardRepository implements DashboardRepository {
  dashboards = new Map<string, Dashboard>();

  async findById(id: string) {
    return this.dashboards.get(id) ?? null;
  }

  async list(organizationId: string) {
    return [...this.dashboards.values()].filter((item) => item.organizationId === organizationId);
  }

  async listWidgets(dashboardId: string) {
    return (await this.findById(dashboardId))?.widgets ?? [];
  }

  async createWithAudit(data: CreateDashboardData): Promise<Dashboard> {
    const now = new Date();
    const id = randomUUID();
    const dashboard: Dashboard = {
      id,
      organizationId: data.organizationId,
      name: data.name,
      audience: data.audience,
      ownerUserId: data.ownerUserId ?? null,
      status: "DRAFT",
      widgets: (data.widgets ?? []).map((widget, index) => ({
        id: randomUUID(),
        dashboardId: id,
        visualizationType: widget.visualizationType,
        metricDefinitionId: widget.metricDefinitionId ?? null,
        kpiId: widget.kpiId ?? null,
        reportFilter: widget.reportFilter ?? emptyReportFilter(),
        sortOrder: widget.sortOrder ?? index,
        status: "ACTIVE" as const,
        kpiKey: widget.kpiKey ?? null,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    this.dashboards.set(id, dashboard);
    return dashboard;
  }

  async updateStatusWithAudit(id: string, status: Dashboard["status"]): Promise<Dashboard> {
    const current = this.dashboards.get(id)!;
    const updated = { ...current, status, updatedAt: new Date() };
    this.dashboards.set(id, updated);
    return updated;
  }
}

export class FakeKpiRepository implements KpiRepository {
  kpis = new Map<string, Kpi>();

  async findById(id: string) {
    return this.kpis.get(id) ?? null;
  }

  async findByName(organizationId: string, name: string) {
    for (const kpi of this.kpis.values()) {
      if (kpi.organizationId === organizationId && kpi.name === name) return kpi;
    }
    return null;
  }

  async list(organizationId: string) {
    return [...this.kpis.values()].filter((kpi) => kpi.organizationId === organizationId);
  }

  async upsertWithAudit(data: CreateKpiData, actor?: unknown): Promise<Kpi> {
    void actor;
    const existing = await this.findByName(data.organizationId, data.name);
    if (existing) {
      const updated = {
        ...existing,
        metricDefinitionId: data.metricDefinitionId,
        status: data.status ?? existing.status,
        updatedAt: new Date(),
      };
      this.kpis.set(existing.id, updated);
      return updated;
    }
    const now = new Date();
    const kpi: Kpi = {
      id: randomUUID(),
      organizationId: data.organizationId,
      metricDefinitionId: data.metricDefinitionId,
      name: data.name,
      status: data.status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    this.kpis.set(kpi.id, kpi);
    return kpi;
  }
}

export class FakeMetricDefinitionRepository implements MetricDefinitionRepository {
  metrics = new Map<string, MetricDefinition>();

  async findById(id: string) {
    return this.metrics.get(id) ?? null;
  }

  async findByName(organizationId: string, name: string) {
    for (const metric of this.metrics.values()) {
      if (metric.organizationId === organizationId && metric.name === name) return metric;
    }
    return null;
  }

  async upsertWithAudit(data: CreateMetricDefinitionData): Promise<MetricDefinition> {
    const existing = await this.findByName(data.organizationId, data.name);
    if (existing) return existing;
    const now = new Date();
    const metric: MetricDefinition = {
      id: randomUUID(),
      organizationId: data.organizationId,
      name: data.name,
      domain: data.domain,
      analyticsDatasetId: null,
      aggregationFunction: data.aggregationFunction,
      dimensions: data.dimensions ?? {},
      freshnessPolicy: data.freshnessPolicy,
      freshnessIntervalSeconds: null,
      status: data.status ?? "PUBLISHED",
      createdAt: now,
      updatedAt: now,
    };
    this.metrics.set(metric.id, metric);
    return metric;
  }
}
