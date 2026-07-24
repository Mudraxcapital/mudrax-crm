// ============================================================================
// src/modules/reports/application/validators/reportSchemas.ts
// ============================================================================

import { z } from "zod";
import { DASHBOARD_AUDIENCES } from "../../domain/entities/Dashboard";
import { SUPPORTED_EXPORT_FORMATS } from "../../domain/entities/ExportJob";
import { REPORT_TYPES } from "../../domain/entities/ReportType";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

const optionalScopedId = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  uuidSchema.nullable(),
);

const optionalDateString = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().min(1).max(40).nullable(),
);

export const reportFilterSchema = z.object({
  dateFrom: optionalDateString.optional(),
  dateTo: optionalDateString.optional(),
  branchId: optionalScopedId.optional(),
  departmentId: optionalScopedId.optional(),
  teamId: optionalScopedId.optional(),
  userId: optionalScopedId.optional(),
});

export const runReportSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  filter: reportFilterSchema.optional(),
  templateId: uuidSchema.optional(),
});

export const saveReportSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200, "Name is too long."),
  reportType: z.enum(REPORT_TYPES),
  templateId: uuidSchema.optional(),
  filter: reportFilterSchema.optional(),
});

export const deleteSavedReportSchema = z.object({
  savedReportId: uuidSchema,
});

export const rerunSavedReportSchema = z.object({
  savedReportId: uuidSchema,
});

export const exportReportSchema = z.object({
  reportExecutionId: uuidSchema,
  format: z.enum(SUPPORTED_EXPORT_FORMATS),
});

export const createDashboardSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200, "Name is too long."),
  audience: z.enum(DASHBOARD_AUDIENCES),
  widgets: z
    .array(
      z.object({
        visualizationType: z.string().trim().min(1).max(50),
        kpiId: uuidSchema.optional(),
        kpiName: z.string().trim().min(1).max(200).optional(),
        sortOrder: z.number().int().min(0).max(1000).optional(),
        filter: reportFilterSchema.optional(),
      }),
    )
    .optional(),
});

export const publishDashboardSchema = z.object({
  dashboardId: uuidSchema,
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
export type RunReportInput = z.infer<typeof runReportSchema>;
export type SaveReportInput = z.infer<typeof saveReportSchema>;
export type DeleteSavedReportInput = z.infer<typeof deleteSavedReportSchema>;
export type RerunSavedReportInput = z.infer<typeof rerunSavedReportSchema>;
export type ExportReportInput = z.infer<typeof exportReportSchema>;
export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type PublishDashboardInput = z.infer<typeof publishDashboardSchema>;

export function toReportFilter(input?: ReportFilterInput) {
  return {
    dateFrom: input?.dateFrom ?? null,
    dateTo: input?.dateTo ?? null,
    branchId: input?.branchId ?? null,
    departmentId: input?.departmentId ?? null,
    teamId: input?.teamId ?? null,
    userId: input?.userId ?? null,
  };
}
