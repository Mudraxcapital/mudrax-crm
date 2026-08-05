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
  "replace_selected_statuses",
  "archive_and_reimport",
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
    /** Default primary identifier: Phone Number (architecture allows Email / others). */
    duplicateMatchMode: duplicateMatchModeSchema.default("phone"),
    duplicateResolution: duplicateResolutionModeSchema.default("skip_duplicates"),
    /**
     * Lead Stage ids selected for replace_selected_statuses / archive_and_reimport.
     * Statuses are always CRM metadata ids — never hardcoded names.
     */
    selectedStageIds: z.array(uuidSchema).max(200).optional(),
    agentUserIds: z.array(uuidSchema).max(200).optional(),
    distributionStrategy: importDistributionStrategySchema.optional(),
    manualAssigneeUserId: uuidSchema.optional(),
    /**
     * MANUAL percentage split per caller (must sum to 100 when provided).
     * Keys are agent user ids.
     */
    percentages: z.record(uuidSchema, z.coerce.number().min(0).max(100)).optional(),
  })
  .refine((input) => Boolean(input.csvText?.trim()) || (input.rows && input.rows.length > 0), {
    message: "Excel/CSV rows or file content is required.",
    path: ["rows"],
  })
  .refine(
    (input) =>
      input.distributionStrategy !== "MANUAL" ||
      Boolean(input.manualAssigneeUserId) ||
      (input.agentUserIds?.length ?? 0) === 1 ||
      Object.keys(input.percentages ?? {}).length > 0,
    {
      message: "Manual distribution requires an assignee or percentage split.",
      path: ["manualAssigneeUserId"],
    },
  )
  .refine(
    (input) => {
      const percentages = input.percentages;
      if (!percentages || Object.keys(percentages).length === 0) return true;
      const total = Object.values(percentages).reduce((sum, value) => sum + value, 0);
      return Math.round(total) === 100;
    },
    {
      message: "Caller percentages must sum to 100.",
      path: ["percentages"],
    },
  )
  .refine(
    (input) => {
      if (input.distributionStrategy !== "MANUAL") return true;
      const percentages = input.percentages;
      if (!percentages || Object.keys(percentages).length === 0) return true;
      const agents = new Set(input.agentUserIds ?? []);
      if (agents.size === 0) return true;
      return Object.keys(percentages).every((userId) => agents.has(userId));
    },
    {
      message: "Percentage keys must match selected callers.",
      path: ["percentages"],
    },
  )
  .refine(
    (input) =>
      (input.duplicateResolution !== "replace_selected_statuses" &&
        input.duplicateResolution !== "archive_and_reimport") ||
      (input.selectedStageIds?.length ?? 0) > 0,
    {
      message: "Select at least one Lead Status for replace/archive strategies.",
      path: ["selectedStageIds"],
    },
  );

export const previewImportDuplicatesSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(100_000),
  columnMapping: leadImportColumnMappingSchema,
  matchMode: duplicateMatchModeSchema.default("phone"),
  /** When set, only match duplicates inside this campaign (same-campaign replace). */
  campaignId: uuidSchema.optional(),
  /**
   * Creating a brand-new campaign — no CRM leads exist there yet, so skip
   * org-wide duplicate matching (avoids closing leads in other campaigns).
   */
  forNewCampaign: z.boolean().optional(),
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
  note: z.string().trim().min(1).max(4000).optional(),
});

export const bulkCloseLeadsSchema = bulkLeadIdsSchema.extend({
  lostReasonId: uuidSchema,
  note: z.string().trim().min(1, "A note is required when closing leads as Lost.").max(4000),
});

/** Admin/Manager permanent delete — no soft-close / archive. */
export const bulkHardDeleteLeadsSchema = bulkLeadIdsSchema;

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
export type BulkHardDeleteLeadsInput = z.infer<typeof bulkHardDeleteLeadsSchema>;
export type MergeLeadsInput = z.infer<typeof mergeLeadsSchema>;
