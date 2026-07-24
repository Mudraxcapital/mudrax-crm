// ============================================================================
// src/modules/notifications/domain/repositories/NotificationDeliveryRepository.ts
// ============================================================================

import type { DeliveryStatus, NotificationDelivery } from "../entities/NotificationDelivery";
import type { NotificationRetry } from "../entities/NotificationRetry";
import type {
  NotificationsAuditActor,
  NotificationsAuditRecord,
} from "../entities/NotificationsAuditRecord";

export interface CreateDeliveryData {
  notificationId: string;
  providerId: string;
  status?: DeliveryStatus;
  retryOfDeliveryId?: string | null;
}

export interface UpdateDeliveryStatusData {
  status: DeliveryStatus;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  failureReason?: string | null;
}

export interface CreateRetryData {
  notificationDeliveryId: string;
  attemptNumber: number;
  backoffSeconds: number;
  nextEligibleAt: Date;
}

export interface NotificationDeliveryRepository {
  findById(id: string): Promise<NotificationDelivery | null>;
  listByNotification(notificationId: string): Promise<NotificationDelivery[]>;
  listFailedEligibleForRetry(
    organizationId: string,
    now: Date,
    limit?: number,
  ): Promise<NotificationDelivery[]>;

  createWithAudit(
    data: CreateDeliveryData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationDelivery>;

  updateStatusWithAudit(
    id: string,
    data: UpdateDeliveryStatusData,
    organizationId: string,
    actor: NotificationsAuditActor,
    correlationId?: string | null,
  ): Promise<NotificationDelivery>;

  createRetry(data: CreateRetryData): Promise<NotificationRetry>;
  listRetries(deliveryId: string): Promise<NotificationRetry[]>;
  countRetryChain(deliveryId: string): Promise<number>;

  listAuditLog(deliveryId: string): Promise<NotificationsAuditRecord[]>;
}
