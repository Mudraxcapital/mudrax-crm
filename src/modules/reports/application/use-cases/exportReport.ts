// ============================================================================
// src/modules/reports/application/use-cases/exportReport.ts
// ============================================================================

import {
  ExportJobNotFoundError,
  ReportExecutionNotCompletedError,
  ReportExecutionNotFoundError,
  ReportTemplateNotFoundError,
  UnsupportedExportFormatError,
} from "../../domain/errors/ReportErrors";
import type { ExportJobRepository } from "../../domain/repositories/ExportJobRepository";
import type { ReportExecutionRepository } from "../../domain/repositories/ReportExecutionRepository";
import type { ReportTemplateRepository } from "../../domain/repositories/ReportTemplateRepository";
import type { ReportsAuditActor } from "../../domain/entities/ReportsAuditRecord";
import { SUPPORTED_EXPORT_FORMATS } from "../../domain/entities/ExportJob";
import { renderCsv } from "../export/csvExporter";
import { renderPdf } from "../export/pdfExporter";
import { toExportJobDto } from "../dto/ExportJobDto";
import type { SourceDataPort } from "../ports/SourceDataPort";
import type { ExportReportInput } from "../validators/reportSchemas";

export interface RenderedExport {
  job: ReturnType<typeof toExportJobDto>;
  contentType: string;
  fileName: string;
  body: Buffer;
}

async function renderExecutionExport(options: {
  organizationId: string;
  executionId: string;
  format: (typeof SUPPORTED_EXPORT_FORMATS)[number];
  executionRepository: ReportExecutionRepository;
  templateRepository: ReportTemplateRepository;
  sourceData: SourceDataPort;
}): Promise<{ body: Buffer; contentType: string; fileName: string; reportType: string }> {
  const execution = await options.executionRepository.findById(options.executionId);
  if (!execution || execution.organizationId !== options.organizationId) {
    throw new ReportExecutionNotFoundError(options.executionId);
  }
  if (execution.status !== "COMPLETED") {
    throw new ReportExecutionNotCompletedError(execution.id);
  }

  const template = await options.templateRepository.findById(execution.reportTemplateId);
  if (!template) {
    throw new ReportTemplateNotFoundError(execution.reportTemplateId);
  }

  const result = await options.sourceData.getReportRows(
    options.organizationId,
    template.columns.reportType,
    execution.resolvedFilter,
  );

  const body =
    options.format === "CSV"
      ? Buffer.from(renderCsv(result), "utf8")
      : Buffer.from(renderPdf(result), "utf8");

  const extension = options.format === "CSV" ? "csv" : "pdf";
  return {
    body,
    contentType: options.format === "CSV" ? "text/csv; charset=utf-8" : "application/pdf",
    fileName: `${template.columns.reportType.toLowerCase()}-report-${execution.id.slice(0, 8)}.${extension}`,
    reportType: template.columns.reportType,
  };
}

export function makeExportReport(
  executionRepository: ReportExecutionRepository,
  templateRepository: ReportTemplateRepository,
  exportJobRepository: ExportJobRepository,
  sourceData: SourceDataPort,
) {
  return async function exportReport(command: {
    organizationId: string;
    input: ExportReportInput;
    actor: ReportsAuditActor;
  }): Promise<RenderedExport> {
    const { organizationId, input, actor } = command;

    if (!SUPPORTED_EXPORT_FORMATS.includes(input.format)) {
      throw new UnsupportedExportFormatError(input.format);
    }

    let job = await exportJobRepository.createWithAudit(
      {
        organizationId,
        reportExecutionId: input.reportExecutionId,
        exportFormat: input.format,
        status: "RENDERING",
      },
      actor,
    );

    try {
      const rendered = await renderExecutionExport({
        organizationId,
        executionId: input.reportExecutionId,
        format: input.format,
        executionRepository,
        templateRepository,
        sourceData,
      });

      job = await exportJobRepository.updateStatusWithAudit(job.id, "COMPLETED", actor, {
        failureReason: null,
      });

      return {
        job: toExportJobDto(job),
        contentType: rendered.contentType,
        fileName: rendered.fileName,
        body: rendered.body,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      await exportJobRepository.updateStatusWithAudit(job.id, "FAILED", actor, {
        failureReason: message,
      });
      throw error;
    }
  };
}

export function makeDownloadExport(
  exportJobRepository: ExportJobRepository,
  executionRepository: ReportExecutionRepository,
  templateRepository: ReportTemplateRepository,
  sourceData: SourceDataPort,
) {
  return async function downloadExport(command: {
    organizationId: string;
    exportJobId: string;
  }): Promise<RenderedExport> {
    const job = await exportJobRepository.findById(command.exportJobId);
    if (
      !job ||
      job.organizationId !== command.organizationId ||
      !job.reportExecutionId ||
      job.status !== "COMPLETED"
    ) {
      throw new ExportJobNotFoundError(command.exportJobId);
    }

    const rendered = await renderExecutionExport({
      organizationId: command.organizationId,
      executionId: job.reportExecutionId,
      format: job.exportFormat,
      executionRepository,
      templateRepository,
      sourceData,
    });

    return {
      job: toExportJobDto(job),
      contentType: rendered.contentType,
      fileName: rendered.fileName,
      body: rendered.body,
    };
  };
}
