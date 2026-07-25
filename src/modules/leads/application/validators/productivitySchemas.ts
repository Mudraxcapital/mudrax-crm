// ============================================================================
// src/modules/leads/application/validators/productivitySchemas.ts
//
// Zod schemas for Saved Views, CSV import/export, bulk ops, and Lead merge.
// ============================================================================

import { z } from "zod";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const leadFilterConfigSchema = z.object({
  search: z.string().trim().max(200).optional(),
  currentStageId: uuidSchema.optional(),
  leadSourceId: uuidSchema.optional(),
  campaignId: uuidSchema.optional(),
  assignedToUserId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
});

export const createSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(150),
  filterConfig: leadFilterConfigSchema.default({}),
  isShared: z.boolean().default(false),
});

export const updateSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  filterConfig: leadFilterConfigSchema.optional(),
  isShared: z.boolean().optional(),
});

export const advancedLeadSearchSchema = leadFilterConfigSchema.extend({
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

/** Operational import keys that are not Lead Field Definitions. */
export const LEAD_IMPORT_OPERATIONAL_KEYS = [
  "city",
  "state",
  "source",
  "campaign",
  "assignedAgent",
  "notes",
] as const;

/**
 * Dynamic column mapping: keys are field internalKeys (full_name, phone, …)
 * plus operational keys. Legacy aliases `name` → full_name are accepted.
 */
export const leadImportColumnMappingSchema = z
  .record(z.string(), z.string().trim().optional())
  .refine(
    (mapping) => Boolean(mapping.full_name?.trim() || mapping.name?.trim()),
    { message: "Name column mapping is required.", path: ["full_name"] },
  );

export const duplicateMatchModeSchema = z.enum([
  "phone",
  "email",
  "phone_name",
  "phone_or_email",
]);

export const duplicateResolutionModeSchema = z.enum([
  "import_all",
  "skip_duplicates",
  "merge",
  "update_existing",
]);

export const importDistributionStrategySchema = z.enum([
  "ROUND_ROBIN",
  "EQUAL",
  "RANDOM",
  "MANUAL",
]);

export const importLeadsCsvSchema = z
  .object({
    leadSourceId: uuidSchema,
    campaignId: uuidSchema.optional(),
    sourceFileName: z.string().trim().min(1).max(255).default("leads.csv"),
    sheetName: z.string().trim().max(200).optional(),
    /** Legacy raw CSV path (still supported). */
    csvText: z.string().optional(),
    /** Normalized rows from CSV/Excel after client-side parse. */
    rows: z.array(z.record(z.string(), z.string())).optional(),
    columnMapping: leadImportColumnMappingSchema.optional(),
    /** When true (legacy), rows that match an existing Lead for the Customer are skipped. */
    skipDuplicates: z.boolean().default(true),
    duplicateMatchMode: duplicateMatchModeSchema.default("phone_or_email"),
    duplicateResolution: duplicateResolutionModeSchema.default("skip_duplicates"),
    agentUserIds: z.array(uuidSchema).max(200).optional(),
    distributionStrategy: importDistributionStrategySchema.optional(),
    manualAssigneeUserId: uuidSchema.optional(),
  })
  .refine((input) => Boolean(input.csvText?.trim()) || (input.rows && input.rows.length > 0), {
    message: "Import rows or CSV content is required.",
    path: ["rows"],
  })
  .refine(
    (input) =>
      input.distributionStrategy !== "MANUAL" ||
      Boolean(input.manualAssigneeUserId) ||
      (input.agentUserIds?.length ?? 0) === 1,
    {
      message: "Manual distribution requires an assignee.",
      path: ["manualAssigneeUserId"],
    },
  );

export const previewImportDuplicatesSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(5000),
  columnMapping: leadImportColumnMappingSchema,
  matchMode: duplicateMatchModeSchema.default("phone_or_email"),
});

export const bulkLeadIdsSchema = z.object({
  leadIds: z.array(uuidSchema).min(1).max(200),
});

export const bulkAssignLeadsSchema = bulkLeadIdsSchema.extend({
  assignedToUserId: uuidSchema,
});

export const bulkChangeLeadStageSchema = bulkLeadIdsSchema.extend({
  stageId: uuidSchema,
  lostReasonId: uuidSchema.optional(),
});

export const bulkCloseLeadsSchema = bulkLeadIdsSchema.extend({
  lostReasonId: uuidSchema,
});

export const mergeLeadsSchema = z.object({
  survivingLeadId: uuidSchema,
  mergedAwayLeadId: uuidSchema,
  lostReasonId: uuidSchema.optional(),
});

export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;
export type UpdateSavedViewInput = z.infer<typeof updateSavedViewSchema>;
export type AdvancedLeadSearchInput = z.infer<typeof advancedLeadSearchSchema>;
export type ImportLeadsCsvInput = z.infer<typeof importLeadsCsvSchema>;
export type PreviewImportDuplicatesInput = z.infer<typeof previewImportDuplicatesSchema>;
export type BulkAssignLeadsInput = z.infer<typeof bulkAssignLeadsSchema>;
export type BulkChangeLeadStageInput = z.infer<typeof bulkChangeLeadStageSchema>;
export type BulkCloseLeadsInput = z.infer<typeof bulkCloseLeadsSchema>;
export type MergeLeadsInput = z.infer<typeof mergeLeadsSchema>;
