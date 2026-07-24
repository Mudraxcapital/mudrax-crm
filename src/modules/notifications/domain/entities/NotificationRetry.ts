// ============================================================================
// src/modules/notifications/domain/entities/NotificationRetry.ts
//
// Child entity of Notification Delivery — owns only the attempt counter,
// backoff schedule, and next-eligible-time (ADR 0008). Never mutates the
// Delivery it schedules a retry for.
// ============================================================================

export interface NotificationRetry {
  id: string;
  notificationDeliveryId: string;
  attemptNumber: number;
  backoffSeconds: number;
  nextEligibleAt: Date;
  createdAt: Date;
}

/** Default max retry attempts when the caller does not configure one. */
export const DEFAULT_MAX_RETRY_ATTEMPTS = 3;

/** Exponential backoff base (seconds): 30, 60, 120, … capped at 1 hour. */
export function computeBackoffSeconds(attemptNumber: number): number {
  const base = 30 * Math.pow(2, Math.max(0, attemptNumber - 1));
  return Math.min(base, 3600);
}
