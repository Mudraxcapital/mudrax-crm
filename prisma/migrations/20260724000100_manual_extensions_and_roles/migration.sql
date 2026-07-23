-- ============================================================================
-- Migration 0002 — manual: extensions & application_role (EXPAND, phase 1)
-- ============================================================================
-- Hand-written. Lays down infrastructure every later manual migration in
-- this initial layer depends on:
--
--   1. `btree_gist` — required by the range EXCLUDE constraint added in
--      migration 0009 (telephony.queue_memberships overlap prevention).
--   2. `application_role` — the non-owner Postgres role every runtime
--      Prisma Client connection is expected to authenticate as (directly,
--      or via `GRANT application_role TO <env-specific login role>;`).
--      Table *ownership* stays with the migration/DDL role (e.g. the
--      `mudrax` role from docker-compose.yml, or a dedicated migrator role
--      in staging/production) so append-only protections added later
--      (migration 0010) are real: Postgres never lets a REVOKE bind on the
--      *owner* of a table, only on other roles, so the application must
--      run as a role that is NOT the table owner for those protections to
--      have any effect.
--
-- This migration is purely additive (EXPAND) and safe to run against an
-- already-running environment with no application downtime.
-- ============================================================================

-- Required for the GiST-backed range EXCLUDE constraint on
-- telephony.queue_memberships (migration 0009). `btree_gist` supplies GiST
-- operator classes for plain equality (=) on scalar types (uuid, in this
-- case) so they can be combined with a native GiST range operator (&&) in
-- one EXCLUDE constraint — Postgres has no built-in way to express
-- "equality AND range-overlap" across a GiST index without it.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- application_role — the runtime, non-owner Postgres role
-- ----------------------------------------------------------------------------
-- NOLOGIN: this is a group/permission role, never a role anyone connects
-- with directly. Per environment, grant it to the actual login role the
-- application's DATABASE_URL authenticates as, e.g. (run manually, once,
-- per environment — deliberately NOT baked into this migration because the
-- login role name is environment-specific, e.g. "mudrax" in
-- docker-compose.yml / .env.example, but a different, dedicated role in
-- staging/production):
--
--   GRANT application_role TO mudrax;
--
-- Until that GRANT is run in a given environment, the connecting role
-- keeps whatever privileges it already has (typically full owner
-- privileges from having run the migrations) and the append-only
-- protections in migration 0010 have no practical effect against it — this
-- is expected and is exactly why that migration's header calls this out
-- explicitly as an operational prerequisite, not a schema concern.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'application_role') THEN
    CREATE ROLE application_role NOLOGIN;
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- Baseline grants — every schema, every present AND future table
-- ----------------------------------------------------------------------------
-- Grants are intentionally broad here (SELECT/INSERT/UPDATE/DELETE on every
-- table in every module schema) because per-module/per-role data access is
-- governed at the application layer by `rbac`'s Data Scope resolution
-- (platform-contracts.md §2), not by Postgres GRANTs — Postgres-level
-- privilege here exists only to draw ONE hard line this codebase already
-- committed to at the domain layer: structurally append-only tables must
-- reject UPDATE/DELETE even from a fully-privileged application connection.
-- Migration 0010 narrows exactly those tables; nothing else is restricted
-- here.
--
-- ALTER DEFAULT PRIVILEGES ensures tables added by *future* Prisma
-- migrations (the normal EXPAND path for new features) automatically carry
-- the same baseline grant without a follow-up manual migration every time —
-- this is the "repeatable" requirement in practice: the grant rule, once
-- established, self-applies going forward.
DO $$
DECLARE
  schema_name text;
BEGIN
  FOREACH schema_name IN ARRAY ARRAY[
    'organization', 'users', 'rbac', 'customers', 'leads', 'follow_ups',
    'campaigns', 'banks', 'loan_products', 'loan_applications',
    'loan_accounts', 'disbursements', 'telephony', 'documents',
    'notifications', 'reports', 'ai_core', 'ai_documents', 'ai_telephony',
    'ai_crm', 'ai_analytics', 'ai_governance'
  ]
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO application_role', schema_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO application_role', schema_name);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO application_role', schema_name);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO application_role',
      schema_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO application_role',
      schema_name
    );
  END LOOP;
END
$$;
