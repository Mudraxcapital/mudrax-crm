-- Force password change + temporary account lock
ALTER TABLE "users"."users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users"."users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "users"."users" ADD COLUMN IF NOT EXISTS "lockedReason" VARCHAR(200);

-- Tracked login sessions (active + history)
DO $$ BEGIN
  CREATE TYPE "users"."user_session_status" AS ENUM ('ACTIVE', 'ENDED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "users"."user_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "device" VARCHAR(80),
    "browser" VARCHAR(80),
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" VARCHAR(200),
    "status" "users"."user_session_status" NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_sessions_userId_status_idx" ON "users"."user_sessions"("userId", "status");
CREATE INDEX IF NOT EXISTS "user_sessions_userId_loginAt_idx" ON "users"."user_sessions"("userId", "loginAt");

DO $$ BEGIN
  ALTER TABLE "users"."user_sessions"
    ADD CONSTRAINT "user_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
