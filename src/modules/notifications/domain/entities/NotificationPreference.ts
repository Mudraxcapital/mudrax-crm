// ============================================================================
// src/modules/notifications/domain/entities/NotificationPreference.ts
//
// Aggregate Root for per-Recipient, per-EventCategory, optionally
// per-Channel preferences (ADR 0008). Can suppress Operational/Marketing
// only — never Transactional/OTP.
// ============================================================================

import type { ChannelType } from "./NotificationTemplate";
import type { RecipientType } from "./Notification";

export const PREFERENCE_STATUSES = ["CREATED", "UPDATED", "INACTIVE"] as const;
export type PreferenceStatus = (typeof PREFERENCE_STATUSES)[number];

export interface NotificationPreference {
  id: string;
  recipientType: RecipientType;
  recipientId: string;
  eventCategory: string;
  channelType: ChannelType | null;
  isEnabled: boolean;
  status: PreferenceStatus;
  createdAt: Date;
  updatedAt: Date;
}
