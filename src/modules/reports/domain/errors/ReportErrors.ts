// ============================================================================
// src/modules/reports/domain/errors/ReportErrors.ts
// ============================================================================

export class DashboardNotFoundError extends Error {
  constructor(id: string) {
    super(`Dashboard ${id} was not found.`);
    this.name = "DashboardNotFoundError";
  }
}

export class KpiNotFoundError extends Error {
  constructor(idOrName: string) {
    super(`KPI ${idOrName} was not found.`);
    this.name = "KpiNotFoundError";
  }
}

export class ReportTemplateNotFoundError extends Error {
  constructor(id: string) {
    super(`Report Template ${id} was not found.`);
    this.name = "ReportTemplateNotFoundError";
  }
}

export class ReportTemplateNotPublishedError extends Error {
  constructor(id: string) {
    super(`Report Template ${id} is not PUBLISHED.`);
    this.name = "ReportTemplateNotPublishedError";
  }
}

export class SavedReportNotFoundError extends Error {
  constructor(id: string) {
    super(`Saved Report ${id} was not found.`);
    this.name = "SavedReportNotFoundError";
  }
}

export class ReportExecutionNotFoundError extends Error {
  constructor(id: string) {
    super(`Report Execution ${id} was not found.`);
    this.name = "ReportExecutionNotFoundError";
  }
}

export class ExportJobNotFoundError extends Error {
  constructor(id: string) {
    super(`Export Job ${id} was not found.`);
    this.name = "ExportJobNotFoundError";
  }
}

export class UnsupportedExportFormatError extends Error {
  constructor(format: string) {
    super(`Export format "${format}" is not supported. Use CSV or PDF.`);
    this.name = "UnsupportedExportFormatError";
  }
}

export class InvalidReportTypeError extends Error {
  constructor(reportType: string) {
    super(`Unknown report type "${reportType}".`);
    this.name = "InvalidReportTypeError";
  }
}

export class ReportExecutionNotCompletedError extends Error {
  constructor(id: string) {
    super(`Report Execution ${id} is not COMPLETED and cannot be exported.`);
    this.name = "ReportExecutionNotCompletedError";
  }
}
