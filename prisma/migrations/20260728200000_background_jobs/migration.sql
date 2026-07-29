-- ============================================================================
-- Migration — hand-written: jobs schema (EXPAND)
-- ============================================================================
-- Durable background-job execution log for follow-up reminders/escalations,
-- notification queue processing, and failed-job retries. Additive only —
-- does not alter follow_ups / notifications business tables.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "jobs";

CREATE TYPE "jobs"."job_run_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "jobs"."job_runs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "jobType" VARCHAR(120) NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "status" "jobs"."job_run_status" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lockedBy" VARCHAR(120),
    "result" JSONB,
    "errorMessage" TEXT,
    "correlationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_runs_jobType_idempotencyKey_key"
  ON "jobs"."job_runs"("jobType", "idempotencyKey");
CREATE INDEX "job_runs_status_nextAttemptAt_idx"
  ON "jobs"."job_runs"("status", "nextAttemptAt");
CREATE INDEX "job_runs_status_scheduledFor_idx"
  ON "jobs"."job_runs"("status", "scheduledFor");
CREATE INDEX "job_runs_organizationId_idx"
  ON "jobs"."job_runs"("organizationId");

-- Runtime grants (mirrors other additive schemas). Safe no-op when the
-- application_role has not been provisioned yet (e.g. some local setups).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'application_role') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA jobs TO application_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA jobs TO application_role';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA jobs GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO application_role';
  END IF;
END
$$;
