import type { NotificationDelivery } from "../../domain/entities/NotificationDelivery";
import type { NotificationRetry } from "../../domain/entities/NotificationRetry";

export interface NotificationRetryDto {
  id: string;
  notificationDeliveryId: string;
  attemptNumber: number;
  backoffSeconds: number;
  nextEligibleAt: string;
  createdAt: string;
}

export interface NotificationDeliveryDto {
  id: string;
  notificationId: string;
  providerId: string;
  status: NotificationDelivery["status"];
  retryOfDeliveryId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toNotificationRetryDto(retry: NotificationRetry): NotificationRetryDto {
  return {
    id: retry.id,
    notificationDeliveryId: retry.notificationDeliveryId,
    attemptNumber: retry.attemptNumber,
    backoffSeconds: retry.backoffSeconds,
    nextEligibleAt: retry.nextEligibleAt.toISOString(),
    createdAt: retry.createdAt.toISOString(),
  };
}

export function toNotificationDeliveryDto(delivery: NotificationDelivery): NotificationDeliveryDto {
  return {
    id: delivery.id,
    notificationId: delivery.notificationId,
    providerId: delivery.providerId,
    status: delivery.status,
    retryOfDeliveryId: delivery.retryOfDeliveryId,
    sentAt: delivery.sentAt?.toISOString() ?? null,
    deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
    failureReason: delivery.failureReason,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
  };
}
