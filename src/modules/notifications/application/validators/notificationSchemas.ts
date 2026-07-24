// ============================================================================
// src/modules/notifications/application/validators/notificationSchemas.ts
// ============================================================================

import { z } from "zod";
import { SENDABLE_CHANNEL_TYPES } from "../../domain/entities/NotificationTemplate";
import { NOTIFICATION_CATEGORIES, RECIPIENT_TYPES } from "../../domain/entities/Notification";
import { DEFAULT_MAX_RETRY_ATTEMPTS } from "../../domain/entities/NotificationRetry";

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid id.",
  );

export const createNotificationTemplateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(150, "Code is too long.")
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "Code may only contain letters, numbers, dots, underscores, and hyphens.",
    ),
  channelType: z.enum(SENDABLE_CHANNEL_TYPES),
  subject: z.string().trim().max(500, "Subject is too long.").optional(),
  body: z.string().trim().min(1, "Body is required.").max(20000, "Body is too long."),
  publish: z.boolean().optional(),
});

export const updateNotificationTemplateSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "DEPRECATED"]).optional(),
});

export const createTemplateVersionSchema = z.object({
  subject: z.string().trim().max(500, "Subject is too long.").optional(),
  body: z.string().trim().min(1, "Body is required.").max(20000, "Body is too long."),
  publish: z.boolean().optional(),
});

export const sendNotificationSchema = z.object({
  templateId: uuidSchema,
  category: z.enum(NOTIFICATION_CATEGORIES),
  recipientType: z.enum(RECIPIENT_TYPES),
  recipientId: uuidSchema,
  eventCategory: z
    .string()
    .trim()
    .min(1, "Event category is required.")
    .max(150, "Event category is too long.")
    .optional(),
  recipientAddress: z.string().trim().max(320, "Recipient address is too long.").optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  maxRetryAttempts: z.number().int().min(0).max(10).optional().default(DEFAULT_MAX_RETRY_ATTEMPTS),
  processImmediately: z.boolean().optional().default(true),
  scheduledFor: z.coerce.date().optional(),
});

export const upsertNotificationPreferenceSchema = z.object({
  recipientType: z.enum(RECIPIENT_TYPES),
  recipientId: uuidSchema,
  eventCategory: z
    .string()
    .trim()
    .min(1, "Event category is required.")
    .max(150, "Event category is too long."),
  channelType: z.enum(SENDABLE_CHANNEL_TYPES).nullable().optional(),
  isEnabled: z.boolean(),
});

export const processNotificationQueueSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(25),
});

export const retryNotificationDeliverySchema = z.object({
  deliveryId: uuidSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(25),
});

export type CreateNotificationTemplateInput = z.infer<typeof createNotificationTemplateSchema>;
export type UpdateNotificationTemplateInput = z.infer<typeof updateNotificationTemplateSchema>;
export type CreateTemplateVersionInput = z.infer<typeof createTemplateVersionSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type UpsertNotificationPreferenceInput = z.infer<typeof upsertNotificationPreferenceSchema>;
export type ProcessNotificationQueueInput = z.infer<typeof processNotificationQueueSchema>;
export type RetryNotificationDeliveryInput = z.infer<typeof retryNotificationDeliverySchema>;
