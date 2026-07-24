// ============================================================================
// src/modules/notifications/domain/entities/NotificationDelivery.ts
//
// Independent Aggregate Root for one physical send attempt against one
// Provider (ADR 0008). A retry never mutates a failed Delivery — it creates
// a new Delivery linked by `retryOfDeliveryId`.
// ============================================================================

export const DELIVERY_STATUSES = [
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "OPENED",
  "CLICKED",
  "FAILED",
  "BOUNCED",
  "UNDELIVERABLE",
  "EXPIRED",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const FAILED_DELIVERY_STATUSES: DeliveryStatus[] = [
  "FAILED",
  "BOUNCED",
  "UNDELIVERABLE",
  "EXPIRED",
];

export const SUCCESS_DELIVERY_STATUSES: DeliveryStatus[] = [
  "SENT",
  "DELIVERED",
  "READ",
  "OPENED",
  "CLICKED",
];

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  providerId: string;
  status: DeliveryStatus;
  retryOfDeliveryId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isFailedDeliveryStatus(status: DeliveryStatus): boolean {
  return FAILED_DELIVERY_STATUSES.includes(status);
}

export function isSuccessDeliveryStatus(status: DeliveryStatus): boolean {
  return SUCCESS_DELIVERY_STATUSES.includes(status);
}
