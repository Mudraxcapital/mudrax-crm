-- ============================================================================
-- Migration 0006 — manual: append-only protections (CONTRACT, phase 3)
-- ============================================================================
-- Every structurally-append-only table's own schema comment calls for
-- exactly this:
--
--   REVOKE UPDATE, DELETE ON <table> FROM application_role;
--
-- for documents.audit_trail, notifications.communication_log, and
-- ai_core.ai_audit_log (all three verbatim), plus reports.analytics_snapshots
-- ("revoke UPDATE/DELETE at the DB role level"). This is the CONTRACT step
-- of this initial layer: migration 0002 granted `application_role` a
-- broad UPDATE/DELETE baseline on every table (including these four) so
-- the application's day-to-day CRUD works everywhere else without a
-- per-table allow-list; this migration narrows exactly the four tables
-- whose domain layer already exposes zero update/delete use-case at all
-- (platform-contracts.md §4), turning "the application code simply never
-- calls update/delete here" into a real, enforced database guarantee that
-- survives a bug, a bypassed service layer, or an operator running ad hoc
-- SQL through the application's own credentials.
--
-- IMPORTANT — operational prerequisite, not a schema concern: this
-- protection is only real once the application's runtime database
-- connection actually authenticates as (or has been `GRANT`ed)
-- `application_role` rather than the table-owning/migration role. See
-- migration 0002's header for the exact one-line GRANT to run per
-- environment. Until that GRANT is applied, the table owner retains full
-- privileges regardless of these REVOKEs — Postgres never lets a table
-- owner's own implicit privileges be revoked this way, by design.
-- ============================================================================

REVOKE UPDATE, DELETE ON "documents"."audit_trail" FROM application_role;
REVOKE UPDATE, DELETE ON "notifications"."communication_log" FROM application_role;
REVOKE UPDATE, DELETE ON "ai_core"."ai_audit_log" FROM application_role;
REVOKE UPDATE, DELETE ON "reports"."analytics_snapshots" FROM application_role;

-- Defense in depth: these four tables should never gain UPDATE/DELETE
-- through PUBLIC either, in case a future role/grant change elsewhere ever
-- widens PUBLIC's default privileges. PUBLIC is not granted these today
-- (Postgres grants no DML to PUBLIC by default), so these are no-ops now —
-- kept explicit so intent survives even if that ever changes upstream.
REVOKE UPDATE, DELETE ON "documents"."audit_trail" FROM PUBLIC;
REVOKE UPDATE, DELETE ON "notifications"."communication_log" FROM PUBLIC;
REVOKE UPDATE, DELETE ON "ai_core"."ai_audit_log" FROM PUBLIC;
REVOKE UPDATE, DELETE ON "reports"."analytics_snapshots" FROM PUBLIC;
