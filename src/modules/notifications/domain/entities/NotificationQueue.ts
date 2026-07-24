// ============================================================================
// src/modules/notifications/domain/entities/NotificationQueue.ts
//
// Aggregate Root for the standing outbound work queue per Channel/priority
// (ADR 0008). Queue Entry children carry Immediate/Scheduled trigger state.
// ============================================================================

import type { ChannelType } from "./NotificationTemplate";

export const QUEUE_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const TRIGGER_TYPES = ["IMMEDIATE", "SCHEDULED"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const QUEUE_ENTRY_STATUSES = [
  "ENQUEUED",
  "ELIGIBLE",
  "DEQUEUED",
  "RESOLVED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type QueueEntryStatus = (typeof QUEUE_ENTRY_STATUSES)[number];

/** UI/dashboard mapping: Pending ≈ not yet dequeued/resolved. */
export const PENDING_QUEUE_ENTRY_STATUSES: QueueEntryStatus[] = ["ENQUEUED", "ELIGIBLE"];

/** UI/dashboard mapping: Processing ≈ actively being worked. */
export const PROCESSING_QUEUE_ENTRY_STATUSES: QueueEntryStatus[] = ["DEQUEUED"];

export interface NotificationQueue {
  id: string;
  organizationId: string;
  channelType: ChannelType;
  priority: number;
  status: QueueStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationQueueEntry {
  id: string;
  notificationQueueId: string;
  notificationId: string;
  triggerType: TriggerType;
  scheduledFor: Date | null;
  status: QueueEntryStatus;
  createdAt: Date;
  updatedAt: Date;
}
