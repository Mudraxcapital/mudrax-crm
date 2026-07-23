-- ============================================================================
-- Migration 0003 — manual: cross-schema foreign keys (EXPAND, phase 2)
-- ============================================================================
-- Prisma's multi-schema support (schema.prisma `datasource.schemas`) lets
-- one model in schema A declare a plain `@db.Uuid` column that conceptually
-- points at a row in schema B, but Prisma will never generate the
-- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` for it unless a Prisma
-- `@relation` is also declared — and every prisma/models/*.prisma file in
-- this codebase deliberately omits that `@relation` for cross-schema
-- pointers, in order to preserve the one-directional module dependency
-- discipline already enforced at the TypeScript layer (ADR 0001): schema A
-- must never "import" schema B's Prisma model just to get referential
-- integrity.
--
-- Every constraint below is copied verbatim (table/column names, direction)
-- from an explicit `MANUAL SQL FOLLOW-UP` comment already present next to
-- the corresponding field in prisma/models/*.prisma — this migration adds
-- no cross-schema relationship that wasn't already called out by name in
-- the accepted schema, with one deliberate, narrow exception noted inline
-- below (`leads.leads.customer_id`), which resolves a comment that
-- forward-references a "manual FK note" without one having been written
-- down elsewhere.
--
-- Many OTHER cross-schema, plain-UUID columns exist across this schema
-- (e.g. every `*ByUserId` actor/audit column, telephony's polymorphic
-- routing pointers, every AI Platform module's `sourceAiResultId`) that are
-- NOT given a foreign key here. That is intentional, not an oversight:
-- those columns' own schema comments either (a) explicitly describe the
-- reference without ever proposing FK SQL, consistently across their whole
-- file, or (b) are genuinely polymorphic (resolve against more than one
-- possible target table depending on a discriminator column) and cannot
-- carry a single Postgres FK at all. Adding FKs to those columns now would
-- be silently tightening a boundary the schema's own authors deliberately
-- left as an application-layer concern — out of scope for "generate the
-- migration layer for the schema as accepted."
--
-- Ordering: this migration must run after 0001 (every target table must
-- already exist in every schema) and can run before or after 0002 (roles
-- only affect grants, not constraints). It must run before 0004+ (CHECK
-- constraints, partial unique indexes, etc. never depend on cross-schema
-- FKs existing first, but keeping structural referential integrity in
-- place before layering data-integrity rules on top is the safer order).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- organization — targets rbac
-- ----------------------------------------------------------------------------
-- organization.prisma: EscalationRule.escalateToRoleId
ALTER TABLE "organization"."escalation_rules"
  ADD CONSTRAINT "escalation_rules_escalate_to_role_id_fkey"
  FOREIGN KEY ("escalateToRoleId") REFERENCES "rbac"."roles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- users — targets organization
-- ----------------------------------------------------------------------------
-- users.prisma: User.currentTeamId / currentBranchId / currentDepartmentId.
-- SET NULL matches the ON DELETE behavior Prisma already generated for the
-- equivalent *intra-schema* pointers in organization.prisma (Team.branchId,
-- HolidayCalendar.branchId, etc.) — these are denormalized "current"
-- pointers kept in sync by organization's domain events, never the
-- authoritative record (that is organization.user_assignment_history).
ALTER TABLE "users"."users"
  ADD CONSTRAINT "users_current_team_id_fkey"
    FOREIGN KEY ("currentTeamId") REFERENCES "organization"."teams"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "users_current_branch_id_fkey"
    FOREIGN KEY ("currentBranchId") REFERENCES "organization"."branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "users_current_department_id_fkey"
    FOREIGN KEY ("currentDepartmentId") REFERENCES "organization"."departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- rbac — targets users
-- ----------------------------------------------------------------------------
-- rbac.prisma: UserRole.userId. CASCADE matches the ON DELETE behavior
-- Prisma already generated for UserRole.roleId (the other half of this
-- composite-PK join row) — a hard-deleted User's role assignments go with
-- it, same as a hard-deleted Role's.
ALTER TABLE "rbac"."user_roles"
  ADD CONSTRAINT "user_roles_user_id_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- leads — targets customers
-- ----------------------------------------------------------------------------
-- leads.prisma: Lead.customerId's comment reads "No Prisma relation
-- declared (see manual FK note)" but no such note is present elsewhere in
-- that file — this single constraint completes that forward reference,
-- rather than leaving "a Lead cannot be an orphan" (ADR 0004) structurally
-- unenforced. RESTRICT matches customers.md: "Never hard-deleted."
ALTER TABLE "leads"."leads"
  ADD CONSTRAINT "leads_customer_id_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"."customers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- loan_applications — targets customers, leads, loan_products, banks,
-- loan_accounts (verbatim from the MANUAL SQL FOLLOW-UP block on
-- LoanApplication in loan-applications.prisma)
-- ----------------------------------------------------------------------------
ALTER TABLE "loan_applications"."loan_applications"
  ADD CONSTRAINT "loan_applications_customer_id_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"."customers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_applications_lead_id_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"."leads"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_applications_loan_product_id_fkey"
    FOREIGN KEY ("loanProductId") REFERENCES "loan_products"."loan_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_applications_bank_branch_id_fkey"
    FOREIGN KEY ("bankBranchId") REFERENCES "banks"."bank_branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_applications_originating_loan_account_id_fkey"
    FOREIGN KEY ("originatingLoanAccountId") REFERENCES "loan_accounts"."loan_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- loan_accounts — targets loan_applications, customers, banks,
-- loan_products (verbatim from the MANUAL SQL FOLLOW-UP block on
-- LoanAccount in loan-accounts.prisma)
-- ----------------------------------------------------------------------------
ALTER TABLE "loan_accounts"."loan_accounts"
  ADD CONSTRAINT "loan_accounts_originating_application_id_fkey"
    FOREIGN KEY ("originatingApplicationId") REFERENCES "loan_applications"."loan_applications"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_accounts_customer_id_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"."customers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_accounts_bank_id_fkey"
    FOREIGN KEY ("bankId") REFERENCES "banks"."banks"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_accounts_bank_branch_id_fkey"
    FOREIGN KEY ("bankBranchId") REFERENCES "banks"."bank_branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "loan_accounts_loan_product_id_fkey"
    FOREIGN KEY ("loanProductId") REFERENCES "loan_products"."loan_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- disbursements — targets loan_applications, loan_accounts, banks
-- (verbatim from the MANUAL SQL FOLLOW-UP block on Disbursement in
-- disbursements.prisma)
-- ----------------------------------------------------------------------------
ALTER TABLE "disbursements"."disbursements"
  ADD CONSTRAINT "disbursements_loan_application_id_fkey"
    FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"."loan_applications"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "disbursements_loan_account_id_fkey"
    FOREIGN KEY ("loanAccountId") REFERENCES "loan_accounts"."loan_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "disbursements_bank_id_fkey"
    FOREIGN KEY ("bankId") REFERENCES "banks"."banks"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- disbursements.prisma: Commission.commissionPolicyVersionId (verbatim
-- MANUAL SQL FOLLOW-UP)
ALTER TABLE "disbursements"."commissions"
  ADD CONSTRAINT "commissions_commission_policy_version_id_fkey"
  FOREIGN KEY ("commissionPolicyVersionId") REFERENCES "banks"."commission_policy_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- ai_documents — targets documents (verbatim MANUAL SQL FOLLOW-UP on
-- OcrRequest in ai-documents.prisma)
-- ----------------------------------------------------------------------------
-- CASCADE mirrors the intra-schema convention Prisma already generated for
-- documents.ocr_jobs -> documents.document_versions (OcrJob is the
-- same-module analogue of this cross-module OcrRequest): once a Document
-- Version is purged per Retention Policy, its OCR request history goes
-- with it rather than dangling.
ALTER TABLE "ai_documents"."ocr_requests"
  ADD CONSTRAINT "ocr_requests_document_version_id_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "documents"."document_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- ai_governance — targets ai_core (verbatim MANUAL SQL FOLLOW-UP on
-- AiProviderHealthCheck in ai-governance.prisma)
-- ----------------------------------------------------------------------------
-- CASCADE mirrors the intra-schema convention Prisma already generated for
-- notifications.provider_health_checks -> notifications.providers (the
-- same conceptual "health check is a disposable child of its Provider"
-- relationship, just crossing the ai_governance/ai_core boundary instead of
-- being intra-schema).
ALTER TABLE "ai_governance"."provider_health_checks"
  ADD CONSTRAINT "provider_health_checks_ai_provider_id_fkey"
  FOREIGN KEY ("aiProviderId") REFERENCES "ai_core"."ai_providers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
