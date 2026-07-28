// Public API of the `reports` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { SourceModulesDataAdapter } from "./infrastructure/adapters/SourceModulesDataAdapter";
import { PrismaDashboardRepository } from "./infrastructure/repositories/PrismaDashboardRepository";
import { PrismaExportJobRepository } from "./infrastructure/repositories/PrismaExportJobRepository";
import {
  PrismaKpiRepository,
  PrismaMetricDefinitionRepository,
} from "./infrastructure/repositories/PrismaKpiRepository";
import { PrismaReportExecutionRepository } from "./infrastructure/repositories/PrismaReportExecutionRepository";
import { PrismaReportTemplateRepository } from "./infrastructure/repositories/PrismaReportTemplateRepository";
import { PrismaSavedReportRepository } from "./infrastructure/repositories/PrismaSavedReportRepository";

import { makeCreateDashboard } from "./application/use-cases/createDashboard";
import { makeDeleteSavedReport } from "./application/use-cases/deleteSavedReport";
import { makeDownloadExport, makeExportReport } from "./application/use-cases/exportReport";
import { makeGetAnalyticsDashboard } from "./application/use-cases/getAnalyticsDashboard";
import { makeGetCallerLeaderboard } from "./application/use-cases/getCallerLeaderboard";
import { makeGetDashboard, makeListDashboards } from "./application/use-cases/getDashboard";
import { makeGetReportExecution } from "./application/use-cases/getReportExecution";
import {
  makeGetReportTemplate,
  makeListReportTemplates,
} from "./application/use-cases/listReportTemplates";
import { makeGetSavedReport, makeListSavedReports } from "./application/use-cases/listSavedReports";
import { makePublishDashboard } from "./application/use-cases/publishDashboard";
import { makeRerunSavedReport } from "./application/use-cases/rerunSavedReport";
import { makeRunReport } from "./application/use-cases/runReport";
import { makeSaveReport } from "./application/use-cases/saveReport";

import {
  DashboardNotFoundError,
  ExportJobNotFoundError,
  InvalidReportTypeError,
  KpiNotFoundError,
  ReportExecutionNotCompletedError,
  ReportExecutionNotFoundError,
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
  SavedReportNotFoundError,
  UnsupportedExportFormatError,
} from "./domain/errors/ReportErrors";

export type { ReportType } from "./domain/entities/ReportType";
export { REPORT_TYPES, REPORT_TYPE_LABELS } from "./domain/entities/ReportType";
export type { ReportFilter } from "./domain/entities/ReportFilter";
export { emptyReportFilter, resolveReportFilter } from "./domain/entities/ReportFilter";
export type {
  Dashboard,
  DashboardAudience,
  DashboardStatus,
  DashboardWidget,
} from "./domain/entities/Dashboard";
export {
  DASHBOARD_AUDIENCES,
  DASHBOARD_STATUSES,
  WIDGET_STATUSES,
} from "./domain/entities/Dashboard";
export type { ReportTemplate } from "./domain/entities/ReportTemplate";
export type { SavedReport } from "./domain/entities/SavedReport";
export type { ReportExecution } from "./domain/entities/ReportExecution";
export type { ExportJob, SupportedExportFormat } from "./domain/entities/ExportJob";
export { SUPPORTED_EXPORT_FORMATS } from "./domain/entities/ExportJob";
export type { Kpi } from "./domain/entities/Kpi";
export type { MetricDefinition } from "./domain/entities/MetricDefinition";
export type {
  ReportsActorType,
  ReportsAuditActor,
  ReportsAuditRecord,
} from "./domain/entities/ReportsAuditRecord";
export { REPORTS_ACTOR_TYPES } from "./domain/entities/ReportsAuditRecord";

export {
  DashboardNotFoundError,
  ExportJobNotFoundError,
  InvalidReportTypeError,
  KpiNotFoundError,
  ReportExecutionNotCompletedError,
  ReportExecutionNotFoundError,
  ReportTemplateNotFoundError,
  ReportTemplateNotPublishedError,
  SavedReportNotFoundError,
  UnsupportedExportFormatError,
};

export type { AnalyticsDashboardDto, NamedCountDto } from "./application/dto/AnalyticsDashboardDto";
export type { DashboardDto, DashboardWidgetDto } from "./application/dto/DashboardDto";
export type { ReportTemplateDto } from "./application/dto/ReportTemplateDto";
export type { SavedReportDto } from "./application/dto/SavedReportDto";
export type { ReportExecutionDto } from "./application/dto/ReportExecutionDto";
export type { ExportJobDto } from "./application/dto/ExportJobDto";
export type { ReportResultDto } from "./application/dto/ReportResultDto";
export type {
  CallerLeaderboardDto,
  CallerLeaderboardHighlightDto,
  CallerLeaderboardRowDto,
  NamedMetricDto,
} from "./application/dto/CallerLeaderboardDto";

export {
  createDashboardSchema,
  deleteSavedReportSchema,
  exportReportSchema,
  publishDashboardSchema,
  reportFilterSchema,
  rerunSavedReportSchema,
  runReportSchema,
  saveReportSchema,
  toReportFilter,
  type CreateDashboardInput,
  type DeleteSavedReportInput,
  type ExportReportInput,
  type PublishDashboardInput,
  type ReportFilterInput,
  type RerunSavedReportInput,
  type RunReportInput,
  type SaveReportInput,
} from "./application/validators/reportSchemas";
export {
  callerLeaderboardQuerySchema,
  callerLeaderboardPresetSchema,
  callerLeaderboardSortSchema,
  type CallerLeaderboardQuery,
  type CallerLeaderboardPreset,
  type CallerLeaderboardSort,
  type CallerLeaderboardScope,
} from "./application/validators/callerLeaderboardSchemas";
export { resolveLeaderboardRange } from "./application/services/leaderboardRange";

const dashboardRepository = new PrismaDashboardRepository(prisma);
const templateRepository = new PrismaReportTemplateRepository(prisma);
const savedReportRepository = new PrismaSavedReportRepository(prisma);
const executionRepository = new PrismaReportExecutionRepository(prisma);
const exportJobRepository = new PrismaExportJobRepository(prisma);
const kpiRepository = new PrismaKpiRepository(prisma);
const metricDefinitionRepository = new PrismaMetricDefinitionRepository(prisma);
const sourceData = new SourceModulesDataAdapter();

export const getAnalyticsDashboard = makeGetAnalyticsDashboard(sourceData);
export const getCallerLeaderboard = makeGetCallerLeaderboard();
export const runReport = makeRunReport(templateRepository, executionRepository, sourceData);
export const saveReport = makeSaveReport(templateRepository, savedReportRepository);
export const deleteSavedReport = makeDeleteSavedReport(savedReportRepository);
export const listSavedReports = makeListSavedReports(savedReportRepository, templateRepository);
export const getSavedReport = makeGetSavedReport(savedReportRepository, templateRepository);
export const rerunSavedReport = makeRerunSavedReport(
  savedReportRepository,
  templateRepository,
  runReport,
);
export const exportReport = makeExportReport(
  executionRepository,
  templateRepository,
  exportJobRepository,
  sourceData,
);
export const downloadExport = makeDownloadExport(
  exportJobRepository,
  executionRepository,
  templateRepository,
  sourceData,
);
export const createDashboard = makeCreateDashboard(dashboardRepository, kpiRepository);
export const publishDashboard = makePublishDashboard(dashboardRepository);
export const getDashboard = makeGetDashboard(dashboardRepository);
export const listDashboards = makeListDashboards(dashboardRepository);
export const listReportTemplates = makeListReportTemplates(templateRepository);
export const getReportTemplate = makeGetReportTemplate(templateRepository);
export const getReportExecution = makeGetReportExecution(
  executionRepository,
  templateRepository,
  sourceData,
);

export async function listKpis(organizationId: string) {
  return kpiRepository.list(organizationId);
}

/** Seed/admin helpers — used by prisma seed step 15. */
export const reportsCatalog = {
  upsertMetricDefinition: metricDefinitionRepository.upsertWithAudit.bind(
    metricDefinitionRepository,
  ),
  upsertKpi: kpiRepository.upsertWithAudit.bind(kpiRepository),
  createReportTemplate: templateRepository.createWithAudit.bind(templateRepository),
  createDashboard: dashboardRepository.createWithAudit.bind(dashboardRepository),
};
