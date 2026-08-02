// ============================================================================
// src/modules/telephony/application/validators/telephonySchemas.ts
//
// Input validation for the telephony module's Server Actions/API Route
// Handlers. Field limits mirror prisma/models/telephony.prisma's column
// constraints. `organizationId` is deliberately never part of these schemas
// — see leads' leadSchemas.ts's identical convention.
// ============================================================================

import { z } from "zod";
import { CALL_STATUSES } from "../../domain/entities/CallAttempt";
import { MANUAL_AGENT_SESSION_STATUSES } from "../../domain/entities/AgentSession";

/** Matches Postgres's own `uuid` column acceptance rule — see leads' leadSchemas.ts's identical comment. */
const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const initiateClickToCallSchema = z
  .object({
    leadId: uuidSchema.optional(),
    customerId: uuidSchema.optional(),
    agentUserId: uuidSchema.optional(),
    toPhoneNumber: z.string().trim().max(20).optional(),
    callerIdUsed: z.string().trim().max(20).optional(),
  })
  .refine((data) => Boolean(data.leadId) || Boolean(data.customerId), {
    message: "A call must reference at least one of leadId or customerId.",
    path: ["leadId"],
  });

export const updateCallAttemptStatusSchema = z.object({
  status: z.enum(CALL_STATUSES),
  disposition: z
    .enum(["ANSWERED", "NO_ANSWER", "BUSY", "FAILED", "VOICEMAIL", "CONGESTION"])
    .optional(),
  callOutcomeId: uuidSchema.nullable().optional(),
  /**
   * Optional client-measured duration (seconds). When set, used instead of
   * server-side answeredAt→now math. Additive — web forms omit this field.
   */
  durationSeconds: z.number().int().min(0).max(8 * 60 * 60).optional(),
});

export const createCallOutcomeSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150, "Name is too long."),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCallOutcomeSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150, "Name is too long.").optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createCallNoteSchema = z.object({
  body: z.string().trim().min(1, "Note body is required.").max(4000, "Note is too long."),
});

export const updateCallNoteSchema = z.object({
  body: z.string().trim().min(1, "Note body is required.").max(4000, "Note is too long."),
});

export const startAgentSessionSchema = z.object({
  extensionNumber: z.string().trim().min(1).max(20).optional(),
});

export const changeAgentSessionStatusSchema = z.object({
  status: z.enum(MANUAL_AGENT_SESSION_STATUSES),
});

export const createCallRecordingSchema = z.object({
  callAttemptId: uuidSchema,
  storageReference: z.string().trim().min(1, "Storage reference is required.").max(1000),
  durationSeconds: z.number().int().min(0).optional(),
  providerMetadata: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
});

export const updateCallRecordingSchema = z.object({
  durationSeconds: z.number().int().min(0).nullable().optional(),
  endedAt: z.coerce.date().nullable().optional(),
  providerMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type InitiateClickToCallInput = z.infer<typeof initiateClickToCallSchema>;
export type UpdateCallAttemptStatusInput = z.infer<typeof updateCallAttemptStatusSchema>;
export type CreateCallOutcomeInput = z.infer<typeof createCallOutcomeSchema>;
export type UpdateCallOutcomeInput = z.infer<typeof updateCallOutcomeSchema>;
export type CreateCallNoteInput = z.infer<typeof createCallNoteSchema>;
export type UpdateCallNoteInput = z.infer<typeof updateCallNoteSchema>;
export type StartAgentSessionInput = z.infer<typeof startAgentSessionSchema>;
export type ChangeAgentSessionStatusInput = z.infer<typeof changeAgentSessionStatusSchema>;
export type CreateCallRecordingInput = z.infer<typeof createCallRecordingSchema>;
export type UpdateCallRecordingInput = z.infer<typeof updateCallRecordingSchema>;
