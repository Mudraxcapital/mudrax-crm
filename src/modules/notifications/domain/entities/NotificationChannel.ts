// ============================================================================
// src/modules/notifications/domain/entities/NotificationChannel.ts
//
// Aggregate Root for Organization-level medium configuration. Providers
// (including the Null adapter used today) belong to exactly one Channel.
// ============================================================================

import type { ChannelType } from "./NotificationTemplate";

export const CHANNEL_STATUSES = ["CONFIGURED", "ACTIVE", "SUSPENDED", "RETIRED"] as const;
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

export const NOTIFICATION_PROVIDER_TYPES = [
  "TWILIO",
  "MSG91",
  "GUPSHUP",
  "META_WHATSAPP",
  "AWS_SES",
  "SENDGRID",
  "FIREBASE",
] as const;
export type NotificationProviderType = (typeof NOTIFICATION_PROVIDER_TYPES)[number];

export const PROVIDER_STATUSES = [
  "REGISTERED",
  "ACTIVE",
  "DEGRADED",
  "SUSPENDED",
  "RETIRED",
] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export interface NotificationChannel {
  id: string;
  organizationId: string;
  channelType: ChannelType;
  rateLimitPerMinute: number | null;
  quietHoursStart: Date | null;
  quietHoursEnd: Date | null;
  status: ChannelStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Provider {
  id: string;
  organizationId: string;
  channelId: string;
  providerType: NotificationProviderType;
  configuration: Record<string, unknown>;
  status: ProviderStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Default Null-adapter provider type per sendable channel (schema enum has no NULL value). */
export function defaultNullProviderType(
  channelType: "EMAIL" | "SMS" | "WHATSAPP",
): NotificationProviderType {
  if (channelType === "EMAIL") return "SENDGRID";
  if (channelType === "SMS") return "TWILIO";
  return "META_WHATSAPP";
}

export const NULL_PROVIDER_CONFIGURATION: Record<string, unknown> = {
  adapter: "null",
  description: "Deterministic Null Notification Provider — no external vendor call.",
};
