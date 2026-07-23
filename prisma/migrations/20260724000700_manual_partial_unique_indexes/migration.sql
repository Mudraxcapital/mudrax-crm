-- ============================================================================
-- Migration 0008 — manual: partial unique indexes (MIGRATE, phase 4)
-- ============================================================================
-- Every index below is copied verbatim from an explicit
-- `MANUAL SQL FOLLOW-UP` comment in prisma/models/*.prisma. Prisma's
-- `@@unique` can only express "unique across every row"; every one of
-- these business rules is instead "unique across the subset of rows
-- matching some predicate" (e.g. "at most one CURRENT/ACTIVE/open row"),
-- which Postgres expresses as a `CREATE UNIQUE INDEX ... WHERE ...` partial
-- index and Prisma's schema language has no primitive for at all.
--
-- Plain `CREATE UNIQUE INDEX` (not `CONCURRENTLY`) is safe here because
-- every target table is still empty at this point in the initial migration
-- layer; see prisma/migrations/README.md for the `CONCURRENTLY` pattern a
-- *later*, against-a-live-table migration must use instead.
-- ============================================================================

-- organization.prisma: UserAssignmentHistory — at most one open-ended
-- (current) assignment row per User.
CREATE UNIQUE INDEX "user_assignment_history_one_current_per_user"
  ON "organization"."user_assignment_history" ("userId")
  WHERE "effectiveTo" IS NULL;

-- customers.prisma: CustomerIdentifier — PAN and Aadhaar are singular
-- per Customer among ACTIVE rows (superseded history rows may still
-- coexist).
CREATE UNIQUE INDEX "customer_identifiers_one_active_pan_per_customer"
  ON "customers"."customer_identifiers" ("customerId")
  WHERE "type" = 'PAN' AND "status" = 'ACTIVE';

CREATE UNIQUE INDEX "customer_identifiers_one_active_aadhaar_per_customer"
  ON "customers"."customer_identifiers" ("customerId")
  WHERE "type" = 'AADHAAR' AND "status" = 'ACTIVE';

-- leads.prisma: LeadAssignment — at most one open (unassignedAt IS NULL)
-- assignment per Lead at a time.
CREATE UNIQUE INDEX "lead_assignments_one_open_per_lead"
  ON "leads"."lead_assignments" ("leadId")
  WHERE "unassignedAt" IS NULL;

-- banks.prisma: CommissionPolicyVersion — at most one EFFECTIVE version per
-- Bank/Loan-Product combination. COALESCE folds NULL loanProductId (=
-- "applies to every Loan Product of this Bank") to a fixed sentinel so
-- Postgres's "every NULL is distinct" rule doesn't under-enforce this.
CREATE UNIQUE INDEX "commission_policy_versions_one_effective"
  ON "banks"."commission_policy_versions" (
    "bankId", COALESCE("loanProductId", '00000000-0000-0000-0000-000000000000')
  )
  WHERE "status" = 'EFFECTIVE';

-- loan-applications.prisma: LoanOffer — at most one Selected Loan Offer
-- per Lead.
CREATE UNIQUE INDEX "loan_offers_one_selected_per_lead"
  ON "loan_applications"."loan_offers" ("leadId")
  WHERE "status" = 'SELECTED';

-- loan-accounts.prisma: EmiSchedule — at most one ACTIVE schedule per Loan
-- Account.
CREATE UNIQUE INDEX "emi_schedules_one_active_per_account"
  ON "loan_accounts"."emi_schedules" ("loanAccountId")
  WHERE "status" = 'ACTIVE';

-- telephony.prisma: TelephonyLine — bound to at most one live (non-terminal)
-- Call Attempt at a time.
CREATE UNIQUE INDEX "call_attempts_one_live_per_line"
  ON "telephony"."call_attempts" ("telephonyLineId")
  WHERE "status" NOT IN ('COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED');

-- telephony.prisma: AgentSession — exactly one Active (non-logged-out)
-- session per Extension.
CREATE UNIQUE INDEX "agent_sessions_one_active_per_extension"
  ON "telephony"."agent_sessions" ("extensionId")
  WHERE "status" != 'LOGGED_OUT';

-- documents.prisma: DocumentVersion — at most one CURRENT version per
-- Document.
CREATE UNIQUE INDEX "document_versions_one_current_per_document"
  ON "documents"."document_versions" ("documentId")
  WHERE "status" = 'CURRENT';

-- documents.prisma: LegalHold — at most one active (not-yet-lifted) hold
-- per Document, the fast-lookup shape the "no active Legal Hold" purge
-- precondition needs.
CREATE UNIQUE INDEX "legal_holds_one_active_per_document"
  ON "documents"."legal_holds" ("documentId")
  WHERE "liftedAt" IS NULL;
