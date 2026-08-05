// ============================================================================
// src/infra/jobs/types.ts
// ============================================================================

export const JOB_TYPES = {
  FOLLOW_UP_LIFECYCLE: "follow-up.lifecycle",
  FOLLOW_UP_REMINDER: "follow-up.reminder",
  FOLLOW_UP_ESCALATION_NOTIFY: "follow-up.escalation-notify",
  NOTIFICATIONS_PROCESS_QUEUE: "notifications.process-queue",
  NOTIFICATIONS_RETRY_FAILED: "notifications.retry-failed",
  LEADS_TEMPORARY_ASSIGNMENT_EXPIRY: "leads.temporary-assignment-expiry",
  JOBS_RETRY_FAILED: "jobs.retry-failed",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export type JobRunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface JobRunRecord {
  id: string;
  organizationId: string | null;
  jobType: string;
  idempotencyKey: string;
  status: JobRunStatus;
  attempt: number;
  maxAttempts: number;
  scheduledFor: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  nextAttemptAt: Date | null;
  lockedUntil: Date | null;
  lockedBy: string | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  correlationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobHandlerContext {
  organizationId: string;
  correlationId: string;
  now: Date;
  workerId: string;
  timeZone: string;
}

export interface JobHandlerResult {
  processed: number;
  details?: Record<string, unknown>;
}

export interface JobHandler {
  type: JobType;
  /** When true, runner invents a per-tick idempotency key (minute bucket). */
  periodic?: boolean;
  run(ctx: JobHandlerContext): Promise<JobHandlerResult>;
}
