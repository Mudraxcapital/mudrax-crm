-- Unique employee phone numbers (NULLs remain allowed / distinct in PostgreSQL).
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"."users" ("phone");
