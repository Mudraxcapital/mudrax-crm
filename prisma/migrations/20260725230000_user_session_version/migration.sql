-- Session invalidation: bump sessionVersion to revoke all JWTs for a user.
ALTER TABLE "users"."users"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
