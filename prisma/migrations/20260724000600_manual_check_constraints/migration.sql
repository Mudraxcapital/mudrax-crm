-- ============================================================================
-- Migration 0007 — manual: CHECK constraints (MIGRATE, phase 4)
-- ============================================================================
-- Every constraint below is copied verbatim from an explicit
-- `MANUAL SQL FOLLOW-UP` comment in prisma/models/*.prisma, except the last
-- one (ai_analytics.predictions), whose comment calls for a CHECK on an
-- "allowed value set" without enumerating it — see that constraint's own
-- comment for the conservative value set chosen.
-- ============================================================================

-- organization.prisma: WorkingHoursSlot
ALTER TABLE "organization"."working_hours_slots"
  ADD CONSTRAINT "working_hours_slots_day_of_week_check"
    CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "working_hours_slots_time_range_check"
    CHECK ("startTime" < "endTime");

-- customers.prisma: CustomerDuplicateCandidate — canonical, order-independent pair
ALTER TABLE "customers"."customer_duplicate_candidates"
  ADD CONSTRAINT "customer_duplicate_candidates_ordered_pair_check"
  CHECK ("customerAId" < "customerBId");

-- leads.prisma: LeadStage — closeOutcome required iff bucket = 'CLOSED'
ALTER TABLE "leads"."lead_stages"
  ADD CONSTRAINT "lead_stages_close_outcome_check"
  CHECK (("bucket" = 'CLOSED') = ("closeOutcome" IS NOT NULL));

-- loan-products.prisma: LoanProduct — interest-rate / tenure / amount ranges
ALTER TABLE "loan_products"."loan_products"
  ADD CONSTRAINT "loan_products_interest_rate_range_check"
    CHECK ("minInterestRate" <= "maxInterestRate"),
  ADD CONSTRAINT "loan_products_tenure_range_check"
    CHECK ("minTenureMonths" <= "maxTenureMonths"),
  ADD CONSTRAINT "loan_products_amount_range_check"
    CHECK ("minLoanAmount" <= "maxLoanAmount");

-- loan-applications.prisma: LoanApplication — applicationType-conditional
-- fields (ADR 0005): STANDARD carries neither reference; TOP_UP requires
-- originatingLoanAccountId; BALANCE_TRANSFER_IN requires exactly one of
-- originatingLoanAccountId / externalLoanReference.
ALTER TABLE "loan_applications"."loan_applications"
  ADD CONSTRAINT "loan_applications_type_conditional_fields_check"
  CHECK (
    ("applicationType" = 'STANDARD'
      AND "originatingLoanAccountId" IS NULL
      AND "externalLoanReference" IS NULL)
    OR ("applicationType" = 'TOP_UP'
      AND "originatingLoanAccountId" IS NOT NULL
      AND "externalLoanReference" IS NULL)
    OR ("applicationType" = 'BALANCE_TRANSFER_IN'
      AND num_nonnulls("originatingLoanAccountId", "externalLoanReference") = 1)
  );

-- telephony.prisma: CallerId — exactly one owning scope
ALTER TABLE "telephony"."caller_ids"
  ADD CONSTRAINT "caller_ids_exactly_one_scope_check"
  CHECK (num_nonnulls("trunkId", "telephonyLineId", "dialerCampaignId") = 1);

-- documents.prisma: DocumentBundle — subjectId required exactly when
-- subject is not NONE
ALTER TABLE "documents"."document_bundles"
  ADD CONSTRAINT "document_bundles_subject_id_check"
  CHECK (("subject" = 'NONE') = ("subjectId" IS NULL));

-- documents.prisma: DocumentSharing — exactly one target (Document or
-- DocumentBundle)
ALTER TABLE "documents"."document_sharings"
  ADD CONSTRAINT "document_sharings_exactly_one_target_check"
  CHECK (num_nonnulls("documentId", "documentBundleId") = 1);

-- reports.prisma: DashboardWidget — exactly one binding (Metric Definition
-- or KPI)
ALTER TABLE "reports"."dashboard_widgets"
  ADD CONSTRAINT "dashboard_widgets_exactly_one_binding_check"
  CHECK (num_nonnulls("metricDefinitionId", "kpiId") = 1);

-- ai-governance.prisma: RateLimitPolicy — scopeId required unless scope is
-- ORGANIZATION (organizationId alone is sufficient in that case)
ALTER TABLE "ai_governance"."rate_limit_policies"
  ADD CONSTRAINT "rate_limit_policies_scope_id_required_check"
  CHECK ("scopeType" = 'ORGANIZATION' OR "scopeId" IS NOT NULL);

-- ai-governance.prisma: AiTriggerSubscription — binds to exactly one Agent
-- or Workflow
ALTER TABLE "ai_governance"."ai_trigger_subscriptions"
  ADD CONSTRAINT "ai_trigger_subscriptions_exactly_one_target_check"
  CHECK (num_nonnulls("aiAgentId", "aiWorkflowId") = 1);

-- ai-analytics.prisma: Prediction — `targetEntityType` is a free-text
-- polymorphic discriminator with no Prisma enum (it names a target entity
-- type, not a fixed AI-platform vocabulary). Its own comment asks only for
-- "the allowed value set," without enumerating it, so the value set below
-- deliberately mirrors the one already-accepted, closed enum for the same
-- concept elsewhere in this schema — documents.DocumentOwnerType (the
-- polymorphic "which business entity does this row concern" pattern this
-- codebase already uses, ADR 0007) — rather than inventing a new taxonomy.
-- Extending this list later (e.g. adding a new target entity type) is a
-- normal additive CHECK-constraint change, not a redesign.
ALTER TABLE "ai_analytics"."predictions"
  ADD CONSTRAINT "predictions_target_entity_type_check"
  CHECK ("targetEntityType" IN ('CUSTOMER', 'LEAD', 'LOAN_APPLICATION', 'LOAN_ACCOUNT', 'DISBURSEMENT'));
