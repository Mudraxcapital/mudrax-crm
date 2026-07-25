// ============================================================================
// src/modules/reports/application/validators/callerLeaderboardSchemas.ts
// ============================================================================

import { z } from "zod";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const callerLeaderboardPresetSchema = z.enum([
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "custom",
]);

export const callerLeaderboardSortSchema = z.enum([
  "most_calls",
  "most_connections",
  "highest_conversion",
  "longest_talk_time",
  "fastest_follow_ups",
]);

const emptyToUndefined = z.literal("").transform(() => undefined);

const optionalDateString = z.union([
  emptyToUndefined,
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Invalid date.",
    }),
]);

const optionalUuid = z.union([emptyToUndefined, uuidSchema]);

export const callerLeaderboardQuerySchema = z.object({
  preset: callerLeaderboardPresetSchema.default("today"),
  dateFrom: optionalDateString.optional(),
  dateTo: optionalDateString.optional(),
  campaignId: optionalUuid.optional(),
  teamLeadId: optionalUuid.optional(),
  callerId: optionalUuid.optional(),
  /** Lead Stage id filter (CRM metadata — never a hardcoded status name). */
  stageId: optionalUuid.optional(),
  sortBy: callerLeaderboardSortSchema.default("most_calls"),
});

export type CallerLeaderboardQuery = z.infer<typeof callerLeaderboardQuerySchema>;
export type CallerLeaderboardPreset = z.infer<typeof callerLeaderboardPresetSchema>;
export type CallerLeaderboardSort = z.infer<typeof callerLeaderboardSortSchema>;
