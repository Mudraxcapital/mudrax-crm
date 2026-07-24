-- ============================================================================
-- Migration 0009 — manual: exclusion constraints (MIGRATE, phase 4)
-- ============================================================================
-- telephony.prisma: QueueMembership — overlapping eligibility windows for
-- the same (callQueueId, userId) pair must never coexist. A partial unique
-- index cannot express "no two ranges overlap" (that is not an equality
-- relationship); Postgres's EXCLUDE constraint is the one primitive built
-- for exactly this, requiring the `btree_gist` extension (added in
-- migration 0002) to combine ordinary equality comparisons with a native
-- GiST range-overlap (`&&`) operator in a single constraint.
--
-- `tsrange(effectiveFrom, COALESCE(effectiveTo, 'infinity'))` treats an
-- still-open membership (`effectiveTo IS NULL`) as extending to infinity,
-- so a new row can never be added whose window overlaps an existing
-- still-open or historical window for the same Queue/User pair — verbatim
-- the rule already spelled out in QueueMembership's own schema comment.
--
-- NOTE: `effectiveFrom`/`effectiveTo` are plain Prisma `DateTime` columns
-- (no `@db.Timestamptz`), so they materialize as PostgreSQL
-- `timestamp without time zone` — not `timestamptz`. Building this range
-- with `tsrange` (not `tstzrange`) matches the actual column type exactly;
-- using `tstzrange` here would force an implicit `timestamp -> timestamptz`
-- cast, which PostgreSQL correctly refuses to run inside an index/exclusion
-- expression because that conversion is timezone (session)-dependent and
-- therefore not IMMUTABLE (error 42P17).
-- ============================================================================

ALTER TABLE "telephony"."queue_memberships"
  ADD CONSTRAINT "queue_memberships_no_overlap"
  EXCLUDE USING gist (
    "callQueueId" WITH =,
    "userId" WITH =,
    tsrange("effectiveFrom", COALESCE("effectiveTo", 'infinity')) WITH &&
  );
