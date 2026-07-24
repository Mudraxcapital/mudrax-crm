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

export const importLeadsCsvSchema = z.object({
  leadSourceId: uuidSchema,
  campaignId: uuidSchema.optional(),
  sourceFileName: z.string().trim().min(1).max(255).default("leads.csv"),
  csvText: z.string().min(1, "CSV content is required."),
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
export type BulkAssignLeadsInput = z.infer<typeof bulkAssignLeadsSchema>;
export type BulkChangeLeadStageInput = z.infer<typeof bulkChangeLeadStageSchema>;
export type BulkCloseLeadsInput = z.infer<typeof bulkCloseLeadsSchema>;
export type MergeLeadsInput = z.infer<typeof mergeLeadsSchema>;
