-- ============================================================================
-- Migration 0001 — init (EXPAND, phase 0: baseline)
-- ============================================================================
-- Generated verbatim by Prisma's schema-diff engine — NOT hand-written:
--
--   npx prisma migrate diff --from-empty --to-schema prisma --script
--
-- This is the same SQL `prisma migrate dev` would have produced as the first
-- migration against an empty database; it was generated with `migrate diff`
-- instead only because no live Postgres instance was reachable from the
-- authoring environment. It has not been hand-edited beyond this header
-- comment block. Do not hand-edit the statements below — if the Prisma
-- schema changes, regenerate a NEW migration with `prisma migrate dev`
-- rather than editing this file (migrations are immutable once committed;
-- see prisma/migrations/README.md).
--
-- Scope: every Postgres schema, enum, table, column, default, primary key,
-- standard (single-schema) index, and standard (single-schema) foreign key
-- that Prisma's schema language can express directly from
-- prisma/schema.prisma + prisma/models/*.prisma. Every feature Prisma
-- CANNOT express (cross-schema FKs, partial unique indexes, exclusion
-- constraints, CHECK constraints, deferred constraints, trigger-based
-- validation, append-only protections, hash-chain triggers, partitioned
-- tables, generated columns) is added by the numbered manual migrations
-- that follow — see prisma/migrations/README.md for the full run order and
-- rationale.
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_analytics";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_crm";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_documents";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_governance";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_telephony";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "banks";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "campaigns";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "customers";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "disbursements";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "documents";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "follow_ups";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "leads";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "loan_accounts";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "loan_applications";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "loan_products";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notifications";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "organization";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rbac";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "reports";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "telephony";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "users";

-- CreateEnum
CREATE TYPE "ai_analytics"."ai_analytics_artifact_status" AS ENUM ('GENERATED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ai_analytics"."prediction_status" AS ENUM ('PREDICTED', 'REALIZED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ai_analytics"."trend_analysis_status" AS ENUM ('IDENTIFIED', 'REVIEWED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ai_analytics"."anomaly_detection_status" AS ENUM ('FLAGGED', 'TRIAGED', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "ai_core"."ai_provider_type" AS ENUM ('OPEN_AI', 'ANTHROPIC', 'GEMINI', 'AZURE_OPENAI', 'LOCAL', 'OLLAMA');

-- CreateEnum
CREATE TYPE "ai_core"."usage_unit" AS ENUM ('TOKENS', 'GPU_SECONDS', 'AUDIO_SECONDS', 'IMAGES');

-- CreateEnum
CREATE TYPE "ai_core"."ai_capability_type" AS ENUM ('TEXT_GENERATION', 'EMBEDDING', 'VISION_OCR', 'SPEECH_TO_TEXT', 'CLASSIFICATION', 'SCORING', 'SUMMARIZATION', 'FUNCTION_CALLING', 'REASONING');

-- CreateEnum
CREATE TYPE "ai_core"."ai_provider_status" AS ENUM ('REGISTERED', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ai_core"."ai_model_status" AS ENUM ('REGISTERED', 'AVAILABLE', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ai_core"."agent_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ai_core"."workflow_status" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ai_core"."ai_task_status" AS ENUM ('REQUESTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ai_core"."ai_job_status" AS ENUM ('QUEUED', 'DISPATCHED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ai_core"."ai_result_status" AS ENUM ('PRODUCED', 'VALIDATED', 'REJECTED', 'CONSUMED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ai_core"."prompt_template_status" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ai_core"."prompt_version_status" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ai_core"."usage_direction" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "ai_core"."ai_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "ai_crm"."ai_crm_insight_status" AS ENUM ('COMPUTED', 'RECOMPUTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ai_crm"."recommendation_status" AS ENUM ('GENERATED', 'PRESENTED', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ai_crm"."next_best_action_status" AS ENUM ('SUGGESTED', 'ACTED_UPON', 'IGNORED');

-- CreateEnum
CREATE TYPE "ai_crm"."duplicate_detection_status" AS ENUM ('SIGNALED', 'CONSUMED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ai_documents"."ai_document_job_status" AS ENUM ('REQUESTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ai_documents"."extracted_entity_status" AS ENUM ('EXTRACTED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ai_documents"."document_classification_status" AS ENUM ('PREDICTED', 'ACCEPTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "ai_governance"."governance_rule_status" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ai_governance"."rate_limit_scope" AS ENUM ('PROVIDER', 'AGENT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ai_governance"."safety_policy_version_status" AS ENUM ('DRAFT', 'EFFECTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ai_governance"."automation_tier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "ai_governance"."human_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ai_governance"."feedback_type" AS ENUM ('ACCEPT', 'DISMISS', 'CORRECTION');

-- CreateEnum
CREATE TYPE "ai_governance"."experiment_status" AS ENUM ('DRAFT', 'RUNNING', 'CONCLUDED', 'PROMOTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ai_governance"."ai_trigger_subscription_status" AS ENUM ('CONFIGURED', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ai_telephony"."ai_telephony_job_status" AS ENUM ('REQUESTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ai_telephony"."call_transcript_status" AS ENUM ('PRODUCED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ai_telephony"."ai_telephony_insight_status" AS ENUM ('GENERATED', 'REVIEWED', 'ACCEPTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "banks"."bank_status" AS ENUM ('ONBOARDED', 'ACTIVE', 'SUSPENDED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "banks"."bank_branch_status" AS ENUM ('ADDED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "banks"."commission_policy_status" AS ENUM ('DRAFTED', 'EFFECTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "campaigns"."campaign_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "campaigns"."allocation_method" AS ENUM ('EQUAL', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "campaigns"."campaign_assignment_status" AS ENUM ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "customers"."identity_confidence" AS ENUM ('UNVERIFIED', 'DECLARED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "customers"."customer_status" AS ENUM ('ACTIVE', 'MERGED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "customers"."identifier_type" AS ENUM ('PAN', 'AADHAAR', 'PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "customers"."identifier_status" AS ENUM ('ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "customers"."duplicate_match_type" AS ENUM ('DETERMINISTIC_PAN', 'DETERMINISTIC_AADHAAR', 'PROBABILISTIC_PHONE', 'PROBABILISTIC_EMAIL', 'PROBABILISTIC_NAME_DOB');

-- CreateEnum
CREATE TYPE "customers"."duplicate_candidate_status" AS ENUM ('DETECTED', 'REVIEWED', 'MERGED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "disbursements"."disbursement_status" AS ENUM ('SCHEDULED_EXPECTED', 'DISBURSED', 'RECONCILED', 'REVERSED', 'FAILED');

-- CreateEnum
CREATE TYPE "disbursements"."commission_status" AS ENUM ('ACCRUED', 'INVOICED', 'RECEIVED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "documents"."document_owner_type" AS ENUM ('CUSTOMER', 'LEAD', 'LOAN_APPLICATION', 'LOAN_ACCOUNT', 'DISBURSEMENT');

-- CreateEnum
CREATE TYPE "documents"."storage_provider_type" AS ENUM ('LOCAL_DISK', 'NAS', 'S3', 'AZURE_BLOB');

-- CreateEnum
CREATE TYPE "documents"."storage_location_status" AS ENUM ('ACTIVE', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "documents"."upload_session_status" AS ENUM ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "documents"."attachment_status" AS ENUM ('UPLOADING', 'SCANNING', 'CLEAN', 'INFECTED', 'AVAILABLE', 'PROMOTED_TO_DOCUMENT', 'ARCHIVED', 'PURGED');

-- CreateEnum
CREATE TYPE "documents"."document_status" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'VERIFIED', 'REJECTED', 'RETAINED', 'ARCHIVED', 'PURGE_ELIGIBLE', 'PURGED');

-- CreateEnum
CREATE TYPE "documents"."document_version_status" AS ENUM ('UPLOADED', 'CURRENT', 'SUPERSEDED', 'ARCHIVED', 'PURGED');

-- CreateEnum
CREATE TYPE "documents"."ocr_engine_type" AS ENUM ('GENERIC_OCR', 'AADHAAR_OCR', 'PAN_OCR', 'BANK_STATEMENT_PARSER');

-- CreateEnum
CREATE TYPE "documents"."ocr_job_status" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "documents"."extracted_field_status" AS ENUM ('EXTRACTED', 'REVIEWED', 'CONFIRMED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "documents"."verification_method" AS ENUM ('MANUAL', 'OCR_ASSISTED', 'EKYC');

-- CreateEnum
CREATE TYPE "documents"."verification_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_RESUBMISSION', 'ESCALATED');

-- CreateEnum
CREATE TYPE "documents"."template_status" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "documents"."checklist_status" AS ENUM ('MATERIALIZED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "documents"."checklist_item_status" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUESTED');

-- CreateEnum
CREATE TYPE "documents"."bundle_subject" AS ENUM ('PRIMARY_APPLICANT', 'CO_APPLICANT', 'ASSET', 'NONE');

-- CreateEnum
CREATE TYPE "documents"."bundle_status" AS ENUM ('BUILDING', 'COMPLETE', 'LOCKED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "documents"."bundle_member_status" AS ENUM ('ADDED', 'ACTIVE', 'REMOVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "documents"."retention_policy_status" AS ENUM ('DRAFT', 'EFFECTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "documents"."sharing_status" AS ENUM ('CREATED', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "documents"."actor_type" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "follow_ups"."follow_up_trigger_type" AS ENUM ('FOLLOW_UP', 'CALL_LATER');

-- CreateEnum
CREATE TYPE "follow_ups"."follow_up_status" AS ENUM ('SCHEDULED', 'DUE', 'COMPLETED', 'MISSED', 'ESCALATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "leads"."stage_bucket" AS ENUM ('INITIAL', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "leads"."close_outcome" AS ENUM ('WON', 'LOST');

-- CreateEnum
CREATE TYPE "leads"."assignment_type" AS ENUM ('INITIAL', 'CAMPAIGN_ALLOCATION', 'MANUAL_REASSIGNMENT');

-- CreateEnum
CREATE TYPE "leads"."custom_field_type" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SINGLE_SELECT');

-- CreateEnum
CREATE TYPE "leads"."import_batch_status" AS ENUM ('UPLOADED', 'PARSED', 'AWAITING_RESOLUTION', 'RESOLVED', 'COMMITTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "leads"."row_parse_status" AS ENUM ('PENDING', 'PARSED', 'INVALID');

-- CreateEnum
CREATE TYPE "leads"."duplicate_match_resolution" AS ENUM ('SELECTIVE_DELETE', 'DELETE_ALL', 'IGNORE', 'RELOAD_AS_FRESH');

-- CreateEnum
CREATE TYPE "loan_accounts"."emi_schedule_status" AS ENUM ('GENERATED', 'ACTIVE', 'SUPERSEDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "loan_accounts"."emi_schedule_reason" AS ENUM ('INITIAL', 'RESTRUCTURE', 'PART_PREPAYMENT', 'FORECLOSURE');

-- CreateEnum
CREATE TYPE "loan_accounts"."foreclosure_status" AS ENUM ('REQUESTED', 'QUOTE_GENERATED', 'PAID', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "loan_applications"."application_status_bucket" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_BANK_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'DISBURSEMENT_PENDING', 'CONVERTED');

-- CreateEnum
CREATE TYPE "loan_applications"."application_type" AS ENUM ('STANDARD', 'TOP_UP', 'BALANCE_TRANSFER_IN');

-- CreateEnum
CREATE TYPE "loan_applications"."eligibility_method" AS ENUM ('MANUAL', 'RULE_BASED', 'AUTOMATED_SCORING');

-- CreateEnum
CREATE TYPE "loan_applications"."eligibility_decision" AS ENUM ('ELIGIBLE', 'INELIGIBLE', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "loan_applications"."co_applicant_consent" AS ENUM ('PENDING', 'GRANTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "loan_applications"."loan_offer_status" AS ENUM ('GENERATED', 'PRESENTED', 'SELECTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "loan_products"."loan_product_status" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "notifications"."channel_type" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "notifications"."recipient_type" AS ENUM ('USER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "notifications"."template_lifecycle_status" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "notifications"."version_status" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "notifications"."channel_status" AS ENUM ('CONFIGURED', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "notifications"."notification_provider_type" AS ENUM ('TWILIO', 'MSG91', 'GUPSHUP', 'META_WHATSAPP', 'AWS_SES', 'SENDGRID', 'FIREBASE');

-- CreateEnum
CREATE TYPE "notifications"."provider_status" AS ENUM ('REGISTERED', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "notifications"."preference_status" AS ENUM ('CREATED', 'UPDATED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "notifications"."subscription_status" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED', 'RESUBSCRIBED');

-- CreateEnum
CREATE TYPE "notifications"."notification_category" AS ENUM ('TRANSACTIONAL', 'OTP', 'OPERATIONAL', 'MARKETING');

-- CreateEnum
CREATE TYPE "notifications"."notification_status" AS ENUM ('CREATED', 'RESOLVED', 'QUEUED', 'IN_PROGRESS', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notifications"."queue_status" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "notifications"."trigger_type" AS ENUM ('IMMEDIATE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "notifications"."queue_entry_status" AS ENUM ('ENQUEUED', 'ELIGIBLE', 'DEQUEUED', 'RESOLVED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "notifications"."delivery_status" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'OPENED', 'CLICKED', 'FAILED', 'BOUNCED', 'UNDELIVERABLE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "notifications"."audience_source" AS ENUM ('EXPLICIT_LIST', 'CAMPAIGN_SEGMENT', 'LEAD_FILTER', 'CUSTOMER_SEGMENT');

-- CreateEnum
CREATE TYPE "notifications"."broadcast_status" AS ENUM ('DRAFT', 'SCHEDULED', 'DISPATCHING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notifications"."batch_source_type" AS ENUM ('BROADCAST', 'SCHEDULED_JOB', 'BULK_EVENT_TRIGGER', 'BULK_ADMIN_ACTION');

-- CreateEnum
CREATE TYPE "notifications"."batch_status" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'COMPLETED_WITH_FAILURES', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notifications"."batch_item_status" AS ENUM ('PENDING', 'PROCESSING', 'NOTIFIED', 'FAILED', 'SKIPPED', 'CANCELLED', 'RETRYING');

-- CreateEnum
CREATE TYPE "notifications"."trigger_subscription_status" AS ENUM ('CONFIGURED', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "organization"."organization_status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "organization"."escalation_trigger" AS ENUM ('FOLLOW_UP_OVERDUE', 'CALL_LATER_MISSED', 'DOCUMENT_VERIFICATION_OVERDUE', 'HUMAN_APPROVAL_SLA_BREACH');

-- CreateEnum
CREATE TYPE "organization"."escalation_scope" AS ENUM ('TEAM', 'BRANCH', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "rbac"."data_scope" AS ENUM ('SELF', 'TEAM', 'BRANCH', 'ORGANIZATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "reports"."metric_domain" AS ENUM ('LEAD', 'LOAN', 'TELEPHONY', 'DOCUMENT', 'USER', 'ORGANIZATION', 'AUDIT');

-- CreateEnum
CREATE TYPE "reports"."freshness_policy" AS ENUM ('REAL_TIME', 'NEAR_REAL_TIME', 'PERIODIC');

-- CreateEnum
CREATE TYPE "reports"."dataset_status" AS ENUM ('DEFINED', 'PUBLISHED', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "reports"."metric_definition_status" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "reports"."kpi_status" AS ENUM ('DEFINED', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "reports"."dashboard_audience" AS ENUM ('EXECUTIVE', 'BRANCH', 'TEAM', 'PERSONAL');

-- CreateEnum
CREATE TYPE "reports"."dashboard_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "reports"."widget_status" AS ENUM ('ADDED', 'CONFIGURED', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "reports"."template_lifecycle_status" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "reports"."saved_report_status" AS ENUM ('CREATED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "reports"."scheduled_report_status" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "reports"."execution_trigger_type" AS ENUM ('AD_HOC', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "reports"."execution_status" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "reports"."export_format" AS ENUM ('PDF', 'EXCEL', 'CSV', 'POWER_BI_FEED', 'TABLEAU_FEED', 'DATA_WAREHOUSE_FEED');

-- CreateEnum
CREATE TYPE "reports"."export_job_status" AS ENUM ('QUEUED', 'RENDERING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "telephony"."trunk_type" AS ENUM ('PRI', 'GSM_GATEWAY', 'SIP');

-- CreateEnum
CREATE TYPE "telephony"."trunk_status" AS ENUM ('PROVISIONED', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "telephony"."sim_activation_state" AS ENUM ('PROCURED', 'ACTIVATED', 'IN_SERVICE', 'SUSPENDED', 'BLACKLISTED', 'RETIRED');

-- CreateEnum
CREATE TYPE "telephony"."routing_target_type" AS ENUM ('IVR', 'CALL_QUEUE', 'EXTENSION');

-- CreateEnum
CREATE TYPE "telephony"."call_direction" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "telephony"."call_status" AS ENUM ('INITIATING', 'RINGING', 'ANSWERED', 'ON_HOLD', 'TRANSFERRING', 'CONFERENCING', 'COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "telephony"."call_disposition" AS ENUM ('ANSWERED', 'NO_ANSWER', 'BUSY', 'FAILED', 'VOICEMAIL', 'CONGESTION');

-- CreateEnum
CREATE TYPE "telephony"."monitoring_mode" AS ENUM ('LISTEN', 'WHISPER', 'BARGE');

-- CreateEnum
CREATE TYPE "telephony"."transfer_type" AS ENUM ('BLIND', 'WARM');

-- CreateEnum
CREATE TYPE "telephony"."ivr_version_status" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "telephony"."queue_strategy_type" AS ENUM ('RING_ALL', 'ROUND_ROBIN', 'SKILL_BASED', 'LONGEST_IDLE');

-- CreateEnum
CREATE TYPE "telephony"."agent_session_status" AS ENUM ('LOGGED_IN', 'AVAILABLE', 'ON_CALL', 'AFTER_CALL_WORK', 'IDLE', 'BREAK', 'BUSY', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "telephony"."dialer_campaign_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "telephony"."dialer_queue_status" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "telephony"."dialer_queue_entry_status" AS ENUM ('PENDING', 'DIALING', 'COMPLETED', 'EXHAUSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "users"."user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "users"."mfa_method" AS ENUM ('TOTP', 'SMS_OTP', 'EMAIL_OTP');

-- CreateEnum
CREATE TYPE "users"."data_scope" AS ENUM ('SELF', 'TEAM', 'BRANCH', 'ORGANIZATION', 'SYSTEM');

-- CreateTable
CREATE TABLE "ai_analytics"."forecasts" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "analyticsDatasetId" UUID NOT NULL,
    "metricRef" VARCHAR(200),
    "horizon" JSONB,
    "projectionData" JSONB NOT NULL,
    "status" "ai_analytics"."ai_analytics_artifact_status" NOT NULL DEFAULT 'GENERATED',
    "sourceAiResultId" UUID,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analytics"."predictions" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "targetEntityType" VARCHAR(100) NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "predictedOutcome" JSONB NOT NULL,
    "status" "ai_analytics"."prediction_status" NOT NULL DEFAULT 'PREDICTED',
    "sourceAiResultId" UUID,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analytics"."trend_analyses" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "analyticsDatasetId" UUID NOT NULL,
    "patternDescription" JSONB NOT NULL,
    "status" "ai_analytics"."trend_analysis_status" NOT NULL DEFAULT 'IDENTIFIED',
    "sourceAiResultId" UUID,
    "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analytics"."anomaly_detections" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "analyticsDatasetId" UUID NOT NULL,
    "anomalyDetails" JSONB NOT NULL,
    "severity" VARCHAR(20),
    "requiresHumanApproval" BOOLEAN NOT NULL DEFAULT false,
    "humanApprovalId" UUID,
    "status" "ai_analytics"."anomaly_detection_status" NOT NULL DEFAULT 'FLAGGED',
    "sourceAiResultId" UUID,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_providers" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "providerType" "ai_core"."ai_provider_type" NOT NULL,
    "configuration" JSONB NOT NULL,
    "status" "ai_core"."ai_provider_status" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_models" (
    "id" UUID NOT NULL,
    "aiProviderId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "ai_core"."ai_model_status" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_model_capabilities" (
    "aiModelId" UUID NOT NULL,
    "capability" "ai_core"."ai_capability_type" NOT NULL,

    CONSTRAINT "ai_model_capabilities_pkey" PRIMARY KEY ("aiModelId","capability")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_model_pricing_versions" (
    "id" UUID NOT NULL,
    "aiModelId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "usageUnit" "ai_core"."usage_unit" NOT NULL,
    "pricePerUnit" DECIMAL(14,8) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_model_pricing_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_agents" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "safetyPolicyId" UUID,
    "routingPreference" JSONB,
    "status" "ai_core"."agent_status" NOT NULL DEFAULT 'DRAFT',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_agent_capabilities" (
    "aiAgentId" UUID NOT NULL,
    "capability" "ai_core"."ai_capability_type" NOT NULL,

    CONSTRAINT "ai_agent_capabilities_pkey" PRIMARY KEY ("aiAgentId","capability")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_agent_prompt_templates" (
    "aiAgentId" UUID NOT NULL,
    "promptTemplateId" UUID NOT NULL,

    CONSTRAINT "ai_agent_prompt_templates_pkey" PRIMARY KEY ("aiAgentId","promptTemplateId")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_workflows" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "definition" JSONB NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "ai_core"."workflow_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_tasks" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "aiAgentId" UUID,
    "aiWorkflowId" UUID,
    "workflowRunId" UUID,
    "sourceType" VARCHAR(100) NOT NULL,
    "sourceId" UUID NOT NULL,
    "capability" "ai_core"."ai_capability_type",
    "status" "ai_core"."ai_task_status" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_jobs" (
    "id" UUID NOT NULL,
    "aiTaskId" UUID NOT NULL,
    "aiProviderId" UUID NOT NULL,
    "aiModelId" UUID NOT NULL,
    "promptVersionId" UUID,
    "status" "ai_core"."ai_job_status" NOT NULL DEFAULT 'QUEUED',
    "retryOfJobId" UUID,
    "experimentId" UUID,
    "variantId" UUID,
    "modelRoutingRuleId" UUID,
    "safetyPolicyVersionId" UUID,
    "rateLimitPolicyId" UUID,
    "dispatchSnapshot" JSONB,
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_results" (
    "id" UUID NOT NULL,
    "aiJobId" UUID NOT NULL,
    "status" "ai_core"."ai_result_status" NOT NULL DEFAULT 'PRODUCED',
    "outputPayload" JSONB NOT NULL,
    "confidence" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_configurations" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "providerPreferences" JSONB,
    "budgetCeilings" JSONB,
    "featureFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."prompt_templates" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "status" "ai_core"."prompt_template_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."prompt_versions" (
    "id" UUID NOT NULL,
    "promptTemplateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ai_core"."prompt_version_status" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."prompt_variables" (
    "id" UUID NOT NULL,
    "promptVersionId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "dataType" VARCHAR(50) NOT NULL,
    "isPiiFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "prompt_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."token_usages" (
    "id" UUID NOT NULL,
    "aiJobId" UUID NOT NULL,
    "usageUnit" "ai_core"."usage_unit" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "direction" "ai_core"."usage_direction" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_costs" (
    "id" UUID NOT NULL,
    "aiJobId" UUID NOT NULL,
    "amount" DECIMAL(14,6) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "pricingSnapshot" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_core"."ai_audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "ai_core"."ai_actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "details" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "ai_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_crm"."lead_scores" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "leadId" UUID NOT NULL,
    "scoreType" VARCHAR(50) NOT NULL,
    "scoreValue" DECIMAL(7,4) NOT NULL,
    "status" "ai_crm"."ai_crm_insight_status" NOT NULL DEFAULT 'COMPUTED',
    "sourceAiResultId" UUID,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_crm"."lead_recommendations" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "leadId" UUID NOT NULL,
    "recommendationType" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL,
    "status" "ai_crm"."recommendation_status" NOT NULL DEFAULT 'GENERATED',
    "sourceAiResultId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_crm"."next_best_actions" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "leadId" UUID NOT NULL,
    "synthesizedFromLeadScoreId" UUID,
    "synthesizedFromRecommendationId" UUID,
    "synthesizedFromSentimentId" UUID,
    "content" JSONB NOT NULL,
    "status" "ai_crm"."next_best_action_status" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "next_best_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_crm"."duplicate_detections" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "customerId" UUID NOT NULL,
    "matchedCustomerId" UUID NOT NULL,
    "matchType" VARCHAR(50) NOT NULL,
    "matchScore" DECIMAL(5,4) NOT NULL,
    "status" "ai_crm"."duplicate_detection_status" NOT NULL DEFAULT 'SIGNALED',
    "sourceAiResultId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_documents"."ocr_requests" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "documentVersionId" UUID NOT NULL,
    "sourceAiResultId" UUID,
    "status" "ai_documents"."ai_document_job_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "ocr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_documents"."ocr_results" (
    "id" UUID NOT NULL,
    "ocrRequestId" UUID NOT NULL,
    "fullText" TEXT,
    "structuredLayout" JSONB,
    "confidence" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_documents"."extracted_entities" (
    "id" UUID NOT NULL,
    "ocrResultId" UUID NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "location" JSONB,
    "confidence" DECIMAL(5,4) NOT NULL,
    "status" "ai_documents"."extracted_entity_status" NOT NULL DEFAULT 'EXTRACTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_documents"."document_classifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "documentVersionId" UUID NOT NULL,
    "predictedDocumentTypeCode" VARCHAR(100) NOT NULL,
    "predictedDocumentCategoryCode" VARCHAR(100),
    "confidence" DECIMAL(5,4) NOT NULL,
    "status" "ai_documents"."document_classification_status" NOT NULL DEFAULT 'PREDICTED',
    "sourceAiResultId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."model_routing_rules" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "capability" VARCHAR(50) NOT NULL,
    "candidateModelIds" JSONB NOT NULL,
    "preferenceConfig" JSONB NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "ai_governance"."governance_rule_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."ai_provider_failover_policies" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "aiConfigurationId" UUID,
    "priorityOrder" JSONB NOT NULL,
    "healthThreshold" DECIMAL(5,4),
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "ai_governance"."governance_rule_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_failover_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."provider_health_checks" (
    "id" UUID NOT NULL,
    "aiProviderId" UUID NOT NULL,
    "isHealthy" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."rate_limit_policies" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "scopeType" "ai_governance"."rate_limit_scope" NOT NULL,
    "scopeId" UUID,
    "requestsPerMinute" INTEGER,
    "tokensPerDay" INTEGER,
    "costPerDayLimit" DECIMAL(14,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."safety_policies" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."safety_policy_versions" (
    "id" UUID NOT NULL,
    "safetyPolicyId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "status" "ai_governance"."safety_policy_version_status" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."human_approvals" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "aiResultId" UUID NOT NULL,
    "aiTaskId" UUID,
    "automationTier" "ai_governance"."automation_tier" NOT NULL,
    "status" "ai_governance"."human_approval_status" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "human_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."feedback" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "aiResultId" UUID NOT NULL,
    "promptVersionId" UUID,
    "aiAgentId" UUID,
    "aiExperimentId" UUID,
    "aiExperimentVariantId" UUID,
    "feedbackType" "ai_governance"."feedback_type" NOT NULL,
    "notes" TEXT,
    "submittedByUserId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."ai_experiments" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "successMetric" JSONB NOT NULL,
    "status" "ai_governance"."experiment_status" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "concludedAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."ai_experiment_variants" (
    "id" UUID NOT NULL,
    "aiExperimentId" UUID NOT NULL,
    "promptVersionId" UUID,
    "aiModelId" UUID,
    "aiProviderId" UUID,
    "samplingParams" JSONB,
    "routingStrategyRef" VARCHAR(200),
    "trafficAllocationPercentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance"."ai_trigger_subscriptions" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "domainEventType" VARCHAR(150) NOT NULL,
    "aiAgentId" UUID,
    "aiWorkflowId" UUID,
    "status" "ai_governance"."ai_trigger_subscription_status" NOT NULL DEFAULT 'CONFIGURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_trigger_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_telephony"."transcription_jobs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "callAttemptId" UUID NOT NULL,
    "callRecordingId" UUID NOT NULL,
    "sourceAiResultId" UUID,
    "status" "ai_telephony"."ai_telephony_job_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "transcription_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_telephony"."call_transcripts" (
    "id" UUID NOT NULL,
    "transcriptionJobId" UUID NOT NULL,
    "storageReference" VARCHAR(500) NOT NULL,
    "diarization" JSONB,
    "status" "ai_telephony"."call_transcript_status" NOT NULL DEFAULT 'PRODUCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_telephony"."call_summaries" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "callAttemptId" UUID NOT NULL,
    "callTranscriptId" UUID,
    "summaryText" TEXT NOT NULL,
    "status" "ai_telephony"."ai_telephony_insight_status" NOT NULL DEFAULT 'GENERATED',
    "sourceAiResultId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_telephony"."sentiment_analyses" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "callAttemptId" UUID NOT NULL,
    "segment" VARCHAR(100),
    "sentiment" VARCHAR(50) NOT NULL,
    "toneScore" DECIMAL(5,4),
    "escalationRisk" DECIMAL(5,4),
    "status" "ai_telephony"."ai_telephony_insight_status" NOT NULL DEFAULT 'GENERATED',
    "sourceAiResultId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentiment_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_telephony"."quality_scores" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "callAttemptId" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "criteria" JSONB,
    "status" "ai_telephony"."ai_telephony_insight_status" NOT NULL DEFAULT 'GENERATED',
    "sourceAiResultId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks"."banks" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "status" "banks"."bank_status" NOT NULL DEFAULT 'ONBOARDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks"."bank_branches" (
    "id" UUID NOT NULL,
    "bankId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "status" "banks"."bank_branch_status" NOT NULL DEFAULT 'ADDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks"."commission_policy_versions" (
    "id" UUID NOT NULL,
    "bankId" UUID NOT NULL,
    "loanProductId" UUID,
    "versionNumber" INTEGER NOT NULL,
    "status" "banks"."commission_policy_status" NOT NULL DEFAULT 'DRAFTED',
    "rateStructure" JSONB NOT NULL,
    "clawbackWindowDays" INTEGER,
    "clawbackRule" JSONB,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "commission_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns"."campaigns" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "campaigns"."campaign_status" NOT NULL DEFAULT 'DRAFT',
    "startDate" DATE,
    "endDate" DATE,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns"."campaign_memberships" (
    "campaignId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "allocationWeight" DECIMAL(7,4) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "campaign_memberships_pkey" PRIMARY KEY ("campaignId","userId")
);

-- CreateTable
CREATE TABLE "campaigns"."campaign_assignments" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "initiatedByUserId" UUID NOT NULL,
    "allocationMethod" "campaigns"."allocation_method" NOT NULL,
    "targetLeadCount" INTEGER NOT NULL,
    "status" "campaigns"."campaign_assignment_status" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns"."campaign_assignment_allocations" (
    "id" UUID NOT NULL,
    "campaignAssignmentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "allocatedPercentage" DECIMAL(5,2),
    "allocatedCount" INTEGER,

    CONSTRAINT "campaign_assignment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers"."customers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "dob" DATE,
    "identityConfidence" "customers"."identity_confidence" NOT NULL DEFAULT 'UNVERIFIED',
    "status" "customers"."customer_status" NOT NULL DEFAULT 'ACTIVE',
    "mergedIntoCustomerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers"."customer_identifiers" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "type" "customers"."identifier_type" NOT NULL,
    "valueHash" VARCHAR(128),
    "valueNormalized" VARCHAR(320),
    "valueMasked" VARCHAR(50) NOT NULL,
    "valueEncrypted" TEXT,
    "status" "customers"."identifier_status" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3),
    "verificationSource" VARCHAR(100),
    "supersededByIdentifierId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers"."customer_duplicate_candidates" (
    "id" UUID NOT NULL,
    "customerAId" UUID NOT NULL,
    "customerBId" UUID NOT NULL,
    "matchType" "customers"."duplicate_match_type" NOT NULL,
    "matchScore" DECIMAL(5,4),
    "status" "customers"."duplicate_candidate_status" NOT NULL DEFAULT 'DETECTED',
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_duplicate_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers"."customer_merges" (
    "id" UUID NOT NULL,
    "survivingCustomerId" UUID NOT NULL,
    "mergedAwayCustomerId" UUID NOT NULL,
    "duplicateCandidateId" UUID,
    "mergedByUserId" UUID NOT NULL,
    "reason" TEXT,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_merges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursements"."disbursements" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "loanApplicationId" UUID NOT NULL,
    "loanAccountId" UUID,
    "bankId" UUID NOT NULL,
    "status" "disbursements"."disbursement_status" NOT NULL DEFAULT 'SCHEDULED_EXPECTED',
    "bankReferenceNumber" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "trancheNumber" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursements"."commissions" (
    "id" UUID NOT NULL,
    "disbursementId" UUID NOT NULL,
    "commissionPolicyVersionId" UUID NOT NULL,
    "status" "disbursements"."commission_status" NOT NULL DEFAULT 'ACCRUED',
    "rateSnapshot" JSONB NOT NULL,
    "computedAmount" DECIMAL(18,2) NOT NULL,
    "clawbackRuleSnapshot" JSONB NOT NULL,
    "invoicedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "clawbackAmount" DECIMAL(18,2),
    "clawbackAt" TIMESTAMP(3),
    "clawbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."storage_locations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "providerType" "documents"."storage_provider_type" NOT NULL,
    "configuration" JSONB NOT NULL,
    "status" "documents"."storage_location_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."upload_sessions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "initiatedByUserId" UUID NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL,
    "status" "documents"."upload_session_status" NOT NULL DEFAULT 'INITIATED',
    "totalChunks" INTEGER,
    "receivedChunks" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."attachments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "uploadSessionId" UUID,
    "uploadedByUserId" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(150) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" VARCHAR(128) NOT NULL,
    "storageLocationId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "documents"."attachment_status" NOT NULL DEFAULT 'UPLOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_categories" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_types" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentCategoryId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."documents" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentTypeId" UUID NOT NULL,
    "ownerType" "documents"."document_owner_type" NOT NULL,
    "ownerId" UUID NOT NULL,
    "status" "documents"."document_status" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_versions" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "attachmentId" UUID NOT NULL,
    "storageLocationId" UUID NOT NULL,
    "status" "documents"."document_version_status" NOT NULL DEFAULT 'UPLOADED',
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."ocr_jobs" (
    "id" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "engineType" "documents"."ocr_engine_type" NOT NULL,
    "status" "documents"."ocr_job_status" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."extracted_fields" (
    "id" UUID NOT NULL,
    "ocrJobId" UUID NOT NULL,
    "fieldKey" VARCHAR(150) NOT NULL,
    "fieldValue" TEXT NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "status" "documents"."extracted_field_status" NOT NULL DEFAULT 'EXTRACTED',
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_verifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "method" "documents"."verification_method" NOT NULL,
    "status" "documents"."verification_status" NOT NULL DEFAULT 'PENDING',
    "verifiedByUserId" UUID,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_checklist_templates" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "loanProductId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "documents"."template_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."checklist_template_items" (
    "id" UUID NOT NULL,
    "documentChecklistTemplateId" UUID NOT NULL,
    "documentTypeId" UUID NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_checklists" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "ownerType" "documents"."document_owner_type" NOT NULL,
    "ownerId" UUID NOT NULL,
    "materializedFromTemplateIds" JSONB NOT NULL,
    "status" "documents"."checklist_status" NOT NULL DEFAULT 'MATERIALIZED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."checklist_items" (
    "id" UUID NOT NULL,
    "documentChecklistId" UUID NOT NULL,
    "documentTypeId" UUID NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" "documents"."checklist_item_status" NOT NULL DEFAULT 'PENDING',
    "fulfillingDocumentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_bundles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentChecklistId" UUID NOT NULL,
    "ownerType" "documents"."document_owner_type" NOT NULL,
    "ownerId" UUID NOT NULL,
    "subject" "documents"."bundle_subject" NOT NULL DEFAULT 'NONE',
    "subjectId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "status" "documents"."bundle_status" NOT NULL DEFAULT 'BUILDING',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."bundle_members" (
    "id" UUID NOT NULL,
    "documentBundleId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "checklistItemId" UUID,
    "pinnedDocumentVersionId" UUID,
    "status" "documents"."bundle_member_status" NOT NULL DEFAULT 'ADDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundle_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."retention_policies" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentCategoryId" UUID,
    "documentTypeId" UUID,
    "retentionDurationDays" INTEGER NOT NULL,
    "triggerEvent" VARCHAR(150) NOT NULL,
    "status" "documents"."retention_policy_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."legal_holds" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "appliedByUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedByUserId" UUID,
    "liftedAt" TIMESTAMP(3),

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."document_sharings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentId" UUID,
    "documentBundleId" UUID,
    "pinnedDocumentVersionIds" JSONB NOT NULL,
    "accessToken" VARCHAR(255) NOT NULL,
    "sharedWithEmail" VARCHAR(320),
    "sharedWithPhone" VARCHAR(20),
    "status" "documents"."sharing_status" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" UUID,

    CONSTRAINT "document_sharings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."share_access_log_entries" (
    "id" UUID NOT NULL,
    "documentSharingId" UUID NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_access_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents"."audit_trail" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "documents"."actor_type" NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(200) NOT NULL,
    "targetType" VARCHAR(100) NOT NULL,
    "targetId" UUID NOT NULL,
    "correlationId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups"."follow_ups" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "triggerType" "follow_ups"."follow_up_trigger_type" NOT NULL,
    "status" "follow_ups"."follow_up_status" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "currentAssigneeUserId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" UUID,
    "outcomeNotes" TEXT,
    "missedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalatedToUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups"."follow_up_reassignments" (
    "id" UUID NOT NULL,
    "followUpId" UUID NOT NULL,
    "fromUserId" UUID,
    "toUserId" UUID NOT NULL,
    "reassignedByUserId" UUID NOT NULL,
    "reason" TEXT,
    "reassignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_reassignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."leads" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "leadSourceId" UUID NOT NULL,
    "currentStageId" UUID NOT NULL,
    "lostReasonId" UUID,
    "campaignId" UUID,
    "currentAssigneeUserId" UUID,
    "fullNameSnapshot" VARCHAR(200) NOT NULL,
    "phoneSnapshot" VARCHAR(20),
    "emailSnapshot" VARCHAR(320),
    "nextActionAt" TIMESTAMP(3),
    "nextActionType" VARCHAR(50),
    "importRowId" UUID,
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_stages" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "bucket" "leads"."stage_bucket" NOT NULL,
    "closeOutcome" "leads"."close_outcome",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lost_reasons" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lost_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_sources" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."call_feedback_statuses" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_feedback_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_call_feedback" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "callFeedbackStatusId" UUID NOT NULL,
    "callAttemptId" UUID,
    "recordedByUserId" UUID NOT NULL,
    "durationSeconds" INTEGER,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_call_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_assignments" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "assignedToUserId" UUID NOT NULL,
    "assignedByUserId" UUID,
    "assignmentType" "leads"."assignment_type" NOT NULL,
    "campaignAssignmentId" UUID,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_notes" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."tags" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_tags" (
    "leadId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "taggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("leadId","tagId")
);

-- CreateTable
CREATE TABLE "leads"."custom_field_definitions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "dataType" "leads"."custom_field_type" NOT NULL,
    "selectOptions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."lead_custom_field_values" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "customFieldDefinitionId" UUID NOT NULL,
    "valueText" TEXT,
    "valueNumber" DECIMAL(18,4),
    "valueDate" DATE,
    "valueSelectOption" VARCHAR(150),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."saved_views" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "filterConfig" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."import_batches" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "leadSourceId" UUID NOT NULL,
    "campaignId" UUID,
    "sourceFileName" VARCHAR(255) NOT NULL,
    "sourceAttachmentId" UUID,
    "status" "leads"."import_batch_status" NOT NULL DEFAULT 'UPLOADED',
    "totalRowCount" INTEGER NOT NULL DEFAULT 0,
    "createdRowCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateRowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "committedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."import_rows" (
    "id" UUID NOT NULL,
    "importBatchId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "parseStatus" "leads"."row_parse_status" NOT NULL DEFAULT 'PENDING',
    "parseErrors" JSONB,
    "resolvedCustomerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."duplicate_matches" (
    "id" UUID NOT NULL,
    "importRowId" UUID NOT NULL,
    "matchedCustomerId" UUID NOT NULL,
    "resolution" "leads"."duplicate_match_resolution",
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads"."duplicate_match_existing_leads" (
    "duplicateMatchId" UUID NOT NULL,
    "existingLeadId" UUID NOT NULL,

    CONSTRAINT "duplicate_match_existing_leads_pkey" PRIMARY KEY ("duplicateMatchId","existingLeadId")
);

-- CreateTable
CREATE TABLE "loan_accounts"."loan_statuses" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_accounts"."loan_accounts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "originatingApplicationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "bankId" UUID NOT NULL,
    "bankBranchId" UUID,
    "loanProductId" UUID NOT NULL,
    "loanStatusId" UUID NOT NULL,
    "sanctionedAmount" DECIMAL(18,2) NOT NULL,
    "interestRateSnapshot" DECIMAL(6,3) NOT NULL,
    "tenureMonthsSnapshot" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "supersededByLoanApplicationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_accounts"."emi_schedules" (
    "id" UUID NOT NULL,
    "loanAccountId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "loan_accounts"."emi_schedule_status" NOT NULL DEFAULT 'GENERATED',
    "reason" "loan_accounts"."emi_schedule_reason" NOT NULL DEFAULT 'INITIAL',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emi_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_accounts"."emi_pay_statuses" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emi_pay_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_accounts"."emi_installments" (
    "id" UUID NOT NULL,
    "emiScheduleId" UUID NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "principalComponent" DECIMAL(18,2) NOT NULL,
    "interestComponent" DECIMAL(18,2) NOT NULL,
    "dueAmount" DECIMAL(18,2) NOT NULL,
    "payStatusId" UUID NOT NULL,
    "paidAmount" DECIMAL(18,2),
    "paidDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emi_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_accounts"."foreclosures" (
    "id" UUID NOT NULL,
    "loanAccountId" UUID NOT NULL,
    "status" "loan_accounts"."foreclosure_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteAmount" DECIMAL(18,2),
    "quoteGeneratedAt" TIMESTAMP(3),
    "foreclosureCharge" DECIMAL(18,2),
    "paidAmount" DECIMAL(18,2),
    "paidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foreclosures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications"."application_statuses" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "bucket" "loan_applications"."application_status_bucket" NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications"."loan_applications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "loanProductId" UUID NOT NULL,
    "bankBranchId" UUID,
    "applicationStatusId" UUID NOT NULL,
    "loanOfferId" UUID,
    "applicationType" "loan_applications"."application_type" NOT NULL DEFAULT 'STANDARD',
    "originatingLoanAccountId" UUID,
    "externalLoanReference" JSONB,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "requestedTenureMonths" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "decidedByUserId" UUID,
    "rejectionReason" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications"."eligibility_snapshots" (
    "id" UUID NOT NULL,
    "loanApplicationId" UUID,
    "customerId" UUID NOT NULL,
    "method" "loan_applications"."eligibility_method" NOT NULL,
    "inputsSnapshot" JSONB NOT NULL,
    "decision" "loan_applications"."eligibility_decision" NOT NULL,
    "computedCeilings" JSONB NOT NULL,
    "computedByUserId" UUID,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications"."co_applicants" (
    "id" UUID NOT NULL,
    "loanApplicationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "relationshipType" VARCHAR(100) NOT NULL,
    "declaredIncome" DECIMAL(18,2),
    "declaredObligations" DECIMAL(18,2),
    "consentStatus" "loan_applications"."co_applicant_consent" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "co_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications"."loan_offers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "eligibilitySnapshotId" UUID NOT NULL,
    "bankId" UUID NOT NULL,
    "loanProductId" UUID NOT NULL,
    "offeredAmount" DECIMAL(18,2) NOT NULL,
    "offeredInterestRate" DECIMAL(6,3) NOT NULL,
    "offeredTenureMonths" INTEGER NOT NULL,
    "status" "loan_applications"."loan_offer_status" NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presentedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products"."loan_product_types" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_product_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products"."loan_products" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "bankId" UUID NOT NULL,
    "loanProductTypeId" UUID NOT NULL,
    "variant" VARCHAR(100) NOT NULL DEFAULT 'Standard',
    "name" VARCHAR(200) NOT NULL,
    "status" "loan_products"."loan_product_status" NOT NULL DEFAULT 'DRAFT',
    "minInterestRate" DECIMAL(6,3) NOT NULL,
    "maxInterestRate" DECIMAL(6,3) NOT NULL,
    "minTenureMonths" INTEGER NOT NULL,
    "maxTenureMonths" INTEGER NOT NULL,
    "minLoanAmount" DECIMAL(18,2) NOT NULL,
    "maxLoanAmount" DECIMAL(18,2) NOT NULL,
    "eligibilityRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_templates" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "code" VARCHAR(150) NOT NULL,
    "channelType" "notifications"."channel_type" NOT NULL,
    "status" "notifications"."template_lifecycle_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_template_versions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "status" "notifications"."version_status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_channels" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "channelType" "notifications"."channel_type" NOT NULL,
    "rateLimitPerMinute" INTEGER,
    "quietHoursStart" TIME,
    "quietHoursEnd" TIME,
    "status" "notifications"."channel_status" NOT NULL DEFAULT 'CONFIGURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."providers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "providerType" "notifications"."notification_provider_type" NOT NULL,
    "configuration" JSONB NOT NULL,
    "status" "notifications"."provider_status" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."provider_failover_policies" (
    "id" UUID NOT NULL,
    "notificationChannelId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "priorityOrder" JSONB NOT NULL,
    "healthThreshold" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_failover_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."provider_health_checks" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "isHealthy" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_preferences" (
    "id" UUID NOT NULL,
    "recipientType" "notifications"."recipient_type" NOT NULL,
    "recipientId" UUID NOT NULL,
    "eventCategory" VARCHAR(150) NOT NULL,
    "channelType" "notifications"."channel_type",
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "notifications"."preference_status" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_subscriptions" (
    "id" UUID NOT NULL,
    "recipientType" "notifications"."recipient_type" NOT NULL,
    "recipientId" UUID NOT NULL,
    "topic" VARCHAR(150) NOT NULL,
    "status" "notifications"."subscription_status" NOT NULL DEFAULT 'SUBSCRIBED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "category" "notifications"."notification_category" NOT NULL,
    "templateId" UUID NOT NULL,
    "templateVersionId" UUID NOT NULL,
    "recipientType" "notifications"."recipient_type" NOT NULL,
    "recipientId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "notifications"."notification_status" NOT NULL DEFAULT 'CREATED',
    "batchId" UUID,
    "broadcastId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_queues" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "channelType" "notifications"."channel_type" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "notifications"."queue_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_queue_entries" (
    "id" UUID NOT NULL,
    "notificationQueueId" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "triggerType" "notifications"."trigger_type" NOT NULL DEFAULT 'IMMEDIATE',
    "scheduledFor" TIMESTAMP(3),
    "status" "notifications"."queue_entry_status" NOT NULL DEFAULT 'ENQUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_deliveries" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "status" "notifications"."delivery_status" NOT NULL DEFAULT 'QUEUED',
    "retryOfDeliveryId" UUID,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_retries" (
    "id" UUID NOT NULL,
    "notificationDeliveryId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "backoffSeconds" INTEGER NOT NULL,
    "nextEligibleAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_retries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."broadcasts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "audienceSource" "notifications"."audience_source" NOT NULL,
    "audienceConfig" JSONB NOT NULL,
    "status" "notifications"."broadcast_status" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_batches" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sourceType" "notifications"."batch_source_type" NOT NULL,
    "broadcastId" UUID,
    "throttlePolicy" JSONB,
    "status" "notifications"."batch_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_batch_items" (
    "id" UUID NOT NULL,
    "notificationBatchId" UUID NOT NULL,
    "recipientRef" JSONB NOT NULL,
    "personalizationData" JSONB,
    "status" "notifications"."batch_item_status" NOT NULL DEFAULT 'PENDING',
    "resultingNotificationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."communication_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "notificationDeliveryId" UUID,
    "eventType" VARCHAR(150) NOT NULL,
    "details" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordHash" VARCHAR(128) NOT NULL,
    "previousRecordHash" VARCHAR(128),

    CONSTRAINT "communication_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."event_trigger_subscriptions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "domainEventType" VARCHAR(150) NOT NULL,
    "templateId" UUID NOT NULL,
    "audienceRule" JSONB NOT NULL,
    "channelPolicy" JSONB NOT NULL,
    "status" "notifications"."trigger_subscription_status" NOT NULL DEFAULT 'CONFIGURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_trigger_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."event_trigger_processed_events" (
    "eventId" UUID NOT NULL,
    "triggerSubscriptionId" UUID NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_trigger_processed_events_pkey" PRIMARY KEY ("eventId","triggerSubscriptionId")
);

-- CreateTable
CREATE TABLE "organization"."organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "status" "organization"."organization_status" NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."regions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."branches" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "regionId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."departments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."teams" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."user_assignment_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "teamId" UUID,
    "branchId" UUID,
    "departmentId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "changedByUserId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."holiday_calendars" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."holiday_calendar_entries" (
    "id" UUID NOT NULL,
    "holidayCalendarId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holiday_calendar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."working_hours_policies" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_hours_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."working_hours_slots" (
    "id" UUID NOT NULL,
    "workingHoursPolicyId" UUID NOT NULL,
    "dayOfWeek" SMALLINT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "working_hours_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."escalation_rules" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "triggerType" "organization"."escalation_trigger" NOT NULL,
    "thresholdMinutes" INTEGER NOT NULL,
    "scope" "organization"."escalation_scope" NOT NULL,
    "branchId" UUID,
    "escalateToRoleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."roles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac"."role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "dataScope" "rbac"."data_scope" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedByUserId" UUID,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "rbac"."user_roles" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "assignedByUserId" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "reports"."analytics_datasets" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sourceEvents" JSONB NOT NULL,
    "grainDefinition" JSONB NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "reports"."dataset_status" NOT NULL DEFAULT 'DEFINED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."metric_definitions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "domain" "reports"."metric_domain" NOT NULL,
    "analyticsDatasetId" UUID,
    "aggregationFunction" VARCHAR(100) NOT NULL,
    "dimensions" JSONB NOT NULL,
    "freshnessPolicy" "reports"."freshness_policy" NOT NULL,
    "freshnessIntervalSeconds" INTEGER,
    "status" "reports"."metric_definition_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."metric_definition_versions" (
    "id" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "formula" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."kpis" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "reports"."kpi_status" NOT NULL DEFAULT 'DEFINED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."kpi_target_versions" (
    "id" UUID NOT NULL,
    "kpiId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "targetValue" DECIMAL(18,4) NOT NULL,
    "thresholdConfig" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_target_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."analytics_snapshots" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "metricDefinitionVersionId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."dashboards" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "audience" "reports"."dashboard_audience" NOT NULL,
    "ownerUserId" UUID,
    "status" "reports"."dashboard_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."dashboard_widgets" (
    "id" UUID NOT NULL,
    "dashboardId" UUID NOT NULL,
    "visualizationType" VARCHAR(50) NOT NULL,
    "metricDefinitionId" UUID,
    "kpiId" UUID,
    "reportFilter" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "reports"."widget_status" NOT NULL DEFAULT 'ADDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."report_templates" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "columns" JSONB NOT NULL,
    "analyticsDatasetId" UUID,
    "defaultGrouping" JSONB,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "reports"."template_lifecycle_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."saved_reports" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "reportTemplateId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "filterConfig" JSONB NOT NULL,
    "status" "reports"."saved_report_status" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."scheduled_reports" (
    "id" UUID NOT NULL,
    "savedReportId" UUID NOT NULL,
    "cadence" JSONB NOT NULL,
    "status" "reports"."scheduled_report_status" NOT NULL DEFAULT 'ACTIVE',
    "nextFireAt" TIMESTAMP(3),
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."report_executions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "savedReportId" UUID,
    "scheduledReportId" UUID,
    "reportTemplateId" UUID NOT NULL,
    "triggerType" "reports"."execution_trigger_type" NOT NULL,
    "resolvedFilter" JSONB NOT NULL,
    "status" "reports"."execution_status" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports"."export_jobs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "reportExecutionId" UUID,
    "analyticsDatasetId" UUID,
    "exportFormat" "reports"."export_format" NOT NULL,
    "status" "reports"."export_job_status" NOT NULL DEFAULT 'QUEUED',
    "resultAttachmentId" UUID,
    "retryOfExportJobId" UUID,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."trunks" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "trunkType" "telephony"."trunk_type" NOT NULL,
    "configuration" JSONB NOT NULL,
    "status" "telephony"."trunk_status" NOT NULL DEFAULT 'PROVISIONED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."telephony_lines" (
    "id" UUID NOT NULL,
    "trunkId" UUID NOT NULL,
    "lineIdentifier" VARCHAR(100) NOT NULL,
    "simInventoryId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telephony_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."sim_inventory" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "carrier" VARCHAR(100) NOT NULL,
    "msisdn" VARCHAR(20) NOT NULL,
    "plan" VARCHAR(100),
    "activationState" "telephony"."sim_activation_state" NOT NULL DEFAULT 'PROCURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sim_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."did_numbers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "routingTargetType" "telephony"."routing_target_type" NOT NULL,
    "routingTargetId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "did_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."caller_ids" (
    "id" UUID NOT NULL,
    "presentedNumber" VARCHAR(20) NOT NULL,
    "trunkId" UUID,
    "telephonyLineId" UUID,
    "dialerCampaignId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caller_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."extensions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "extensionNumber" VARCHAR(20) NOT NULL,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_attempts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leadId" UUID,
    "customerId" UUID,
    "extensionId" UUID,
    "trunkId" UUID,
    "telephonyLineId" UUID,
    "ivrFlowVersionId" UUID,
    "direction" "telephony"."call_direction" NOT NULL,
    "status" "telephony"."call_status" NOT NULL DEFAULT 'INITIATING',
    "disposition" "telephony"."call_disposition",
    "retryOfCallAttemptId" UUID,
    "callerIdUsed" VARCHAR(20),
    "providerCallId" VARCHAR(150),
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_recordings" (
    "id" UUID NOT NULL,
    "callAttemptId" UUID NOT NULL,
    "storageReference" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "transcriptRef" VARCHAR(255),
    "summaryRef" VARCHAR(255),
    "qualityScoreRef" VARCHAR(255),
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_recording_access_log" (
    "id" UUID NOT NULL,
    "callRecordingId" UUID NOT NULL,
    "accessedByUserId" UUID NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_recording_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_monitoring_sessions" (
    "id" UUID NOT NULL,
    "callAttemptId" UUID NOT NULL,
    "supervisorUserId" UUID NOT NULL,
    "mode" "telephony"."monitoring_mode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "call_monitoring_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_monitoring_transitions" (
    "id" UUID NOT NULL,
    "callMonitoringSessionId" UUID NOT NULL,
    "toMode" "telephony"."monitoring_mode" NOT NULL,
    "transitionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_monitoring_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_transfers" (
    "id" UUID NOT NULL,
    "callAttemptId" UUID NOT NULL,
    "transferType" "telephony"."transfer_type" NOT NULL,
    "fromExtensionId" UUID,
    "toExtensionId" UUID NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_conferences" (
    "id" UUID NOT NULL,
    "callAttemptId" UUID NOT NULL,
    "participantUserId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "call_conferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."ivrs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ivrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."ivr_flow_versions" (
    "id" UUID NOT NULL,
    "ivrId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "flowDefinition" JSONB NOT NULL,
    "status" "telephony"."ivr_version_status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ivr_flow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."call_queues" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "strategyType" "telephony"."queue_strategy_type" NOT NULL,
    "overflowConfig" JSONB,
    "timeoutSeconds" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."queue_memberships" (
    "id" UUID NOT NULL,
    "callQueueId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."agent_sessions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "extensionId" UUID NOT NULL,
    "status" "telephony"."agent_session_status" NOT NULL DEFAULT 'LOGGED_IN',
    "remoteAgentContext" JSONB,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."agent_status_histories" (
    "id" UUID NOT NULL,
    "agentSessionId" UUID NOT NULL,
    "status" "telephony"."agent_session_status" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."queue_participations" (
    "id" UUID NOT NULL,
    "agentSessionId" UUID NOT NULL,
    "callQueueId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "queue_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."dialer_campaigns" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "crmCampaignId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "pacingConfig" JSONB NOT NULL,
    "retryDefaults" JSONB,
    "status" "telephony"."dialer_campaign_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dialer_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."dialer_campaign_trunks" (
    "dialerCampaignId" UUID NOT NULL,
    "trunkId" UUID NOT NULL,

    CONSTRAINT "dialer_campaign_trunks_pkey" PRIMARY KEY ("dialerCampaignId","trunkId")
);

-- CreateTable
CREATE TABLE "telephony"."dialer_queues" (
    "id" UUID NOT NULL,
    "dialerCampaignId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "telephony"."dialer_queue_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dialer_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."dialer_queue_entries" (
    "id" UUID NOT NULL,
    "dialerQueueId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "status" "telephony"."dialer_queue_entry_status" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dialer_queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telephony"."dialer_retries" (
    "id" UUID NOT NULL,
    "dialerQueueEntryId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "backoffSeconds" INTEGER NOT NULL,
    "nextEligibleAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dialer_retries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."users" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeCode" VARCHAR(50) NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(20),
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "users"."user_status" NOT NULL DEFAULT 'ACTIVE',
    "currentTeamId" UUID,
    "currentBranchId" UUID,
    "currentDepartmentId" UUID,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" "users"."mfa_method",
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."login_attempts" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "emailTried" VARCHAR(320) NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "failureReason" VARCHAR(200),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."api_keys" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "keyHash" VARCHAR(255) NOT NULL,
    "keyPrefix" VARCHAR(12) NOT NULL,
    "dataScope" "users"."data_scope" NOT NULL,
    "integrationRef" VARCHAR(150),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forecasts_organizationId_idx" ON "ai_analytics"."forecasts"("organizationId");

-- CreateIndex
CREATE INDEX "forecasts_analyticsDatasetId_idx" ON "ai_analytics"."forecasts"("analyticsDatasetId");

-- CreateIndex
CREATE INDEX "predictions_organizationId_idx" ON "ai_analytics"."predictions"("organizationId");

-- CreateIndex
CREATE INDEX "predictions_targetEntityType_targetEntityId_idx" ON "ai_analytics"."predictions"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "trend_analyses_organizationId_idx" ON "ai_analytics"."trend_analyses"("organizationId");

-- CreateIndex
CREATE INDEX "trend_analyses_analyticsDatasetId_idx" ON "ai_analytics"."trend_analyses"("analyticsDatasetId");

-- CreateIndex
CREATE INDEX "anomaly_detections_organizationId_idx" ON "ai_analytics"."anomaly_detections"("organizationId");

-- CreateIndex
CREATE INDEX "anomaly_detections_analyticsDatasetId_idx" ON "ai_analytics"."anomaly_detections"("analyticsDatasetId");

-- CreateIndex
CREATE INDEX "ai_providers_organizationId_idx" ON "ai_core"."ai_providers"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_aiProviderId_name_key" ON "ai_core"."ai_models"("aiProviderId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_pricing_versions_aiModelId_versionNumber_key" ON "ai_core"."ai_model_pricing_versions"("aiModelId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ai_agents_organizationId_name_key" ON "ai_core"."ai_agents"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_workflows_organizationId_name_versionNumber_key" ON "ai_core"."ai_workflows"("organizationId", "name", "versionNumber");

-- CreateIndex
CREATE INDEX "ai_tasks_organizationId_idx" ON "ai_core"."ai_tasks"("organizationId");

-- CreateIndex
CREATE INDEX "ai_tasks_sourceType_sourceId_idx" ON "ai_core"."ai_tasks"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ai_tasks_workflowRunId_idx" ON "ai_core"."ai_tasks"("workflowRunId");

-- CreateIndex
CREATE INDEX "ai_jobs_aiTaskId_idx" ON "ai_core"."ai_jobs"("aiTaskId");

-- CreateIndex
CREATE INDEX "ai_jobs_aiProviderId_idx" ON "ai_core"."ai_jobs"("aiProviderId");

-- CreateIndex
CREATE INDEX "ai_jobs_aiModelId_idx" ON "ai_core"."ai_jobs"("aiModelId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_results_aiJobId_key" ON "ai_core"."ai_results"("aiJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_configurations_organizationId_key" ON "ai_core"."ai_configurations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_organizationId_name_key" ON "ai_core"."prompt_templates"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_promptTemplateId_versionNumber_key" ON "ai_core"."prompt_versions"("promptTemplateId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_variables_promptVersionId_name_key" ON "ai_core"."prompt_variables"("promptVersionId", "name");

-- CreateIndex
CREATE INDEX "token_usages_aiJobId_idx" ON "ai_core"."token_usages"("aiJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_costs_aiJobId_key" ON "ai_core"."ai_costs"("aiJobId");

-- CreateIndex
CREATE INDEX "ai_audit_log_organizationId_idx" ON "ai_core"."ai_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "ai_audit_log_targetType_targetId_idx" ON "ai_core"."ai_audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ai_audit_log_occurredAt_idx" ON "ai_core"."ai_audit_log"("occurredAt");

-- CreateIndex
CREATE INDEX "lead_scores_organizationId_idx" ON "ai_crm"."lead_scores"("organizationId");

-- CreateIndex
CREATE INDEX "lead_scores_leadId_idx" ON "ai_crm"."lead_scores"("leadId");

-- CreateIndex
CREATE INDEX "lead_recommendations_organizationId_idx" ON "ai_crm"."lead_recommendations"("organizationId");

-- CreateIndex
CREATE INDEX "lead_recommendations_leadId_idx" ON "ai_crm"."lead_recommendations"("leadId");

-- CreateIndex
CREATE INDEX "next_best_actions_organizationId_idx" ON "ai_crm"."next_best_actions"("organizationId");

-- CreateIndex
CREATE INDEX "next_best_actions_leadId_idx" ON "ai_crm"."next_best_actions"("leadId");

-- CreateIndex
CREATE INDEX "duplicate_detections_organizationId_idx" ON "ai_crm"."duplicate_detections"("organizationId");

-- CreateIndex
CREATE INDEX "duplicate_detections_customerId_idx" ON "ai_crm"."duplicate_detections"("customerId");

-- CreateIndex
CREATE INDEX "ocr_requests_organizationId_idx" ON "ai_documents"."ocr_requests"("organizationId");

-- CreateIndex
CREATE INDEX "ocr_requests_documentVersionId_idx" ON "ai_documents"."ocr_requests"("documentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_results_ocrRequestId_key" ON "ai_documents"."ocr_results"("ocrRequestId");

-- CreateIndex
CREATE INDEX "extracted_entities_ocrResultId_idx" ON "ai_documents"."extracted_entities"("ocrResultId");

-- CreateIndex
CREATE INDEX "document_classifications_organizationId_idx" ON "ai_documents"."document_classifications"("organizationId");

-- CreateIndex
CREATE INDEX "document_classifications_documentVersionId_idx" ON "ai_documents"."document_classifications"("documentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "model_routing_rules_organizationId_capability_versionNumber_key" ON "ai_governance"."model_routing_rules"("organizationId", "capability", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ai_provider_failover_policies_organizationId_versionNumber_key" ON "ai_governance"."ai_provider_failover_policies"("organizationId", "versionNumber");

-- CreateIndex
CREATE INDEX "provider_health_checks_aiProviderId_idx" ON "ai_governance"."provider_health_checks"("aiProviderId");

-- CreateIndex
CREATE INDEX "rate_limit_policies_organizationId_idx" ON "ai_governance"."rate_limit_policies"("organizationId");

-- CreateIndex
CREATE INDEX "rate_limit_policies_scopeType_scopeId_idx" ON "ai_governance"."rate_limit_policies"("scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "safety_policies_organizationId_name_key" ON "ai_governance"."safety_policies"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "safety_policy_versions_safetyPolicyId_versionNumber_key" ON "ai_governance"."safety_policy_versions"("safetyPolicyId", "versionNumber");

-- CreateIndex
CREATE INDEX "human_approvals_organizationId_idx" ON "ai_governance"."human_approvals"("organizationId");

-- CreateIndex
CREATE INDEX "human_approvals_aiResultId_idx" ON "ai_governance"."human_approvals"("aiResultId");

-- CreateIndex
CREATE INDEX "human_approvals_status_idx" ON "ai_governance"."human_approvals"("status");

-- CreateIndex
CREATE INDEX "feedback_organizationId_idx" ON "ai_governance"."feedback"("organizationId");

-- CreateIndex
CREATE INDEX "feedback_aiResultId_idx" ON "ai_governance"."feedback"("aiResultId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_experiments_organizationId_name_key" ON "ai_governance"."ai_experiments"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ai_experiment_variants_aiExperimentId_idx" ON "ai_governance"."ai_experiment_variants"("aiExperimentId");

-- CreateIndex
CREATE INDEX "ai_trigger_subscriptions_domainEventType_idx" ON "ai_governance"."ai_trigger_subscriptions"("domainEventType");

-- CreateIndex
CREATE UNIQUE INDEX "ai_trigger_subscriptions_organizationId_domainEventType_aiA_key" ON "ai_governance"."ai_trigger_subscriptions"("organizationId", "domainEventType", "aiAgentId", "aiWorkflowId");

-- CreateIndex
CREATE INDEX "transcription_jobs_organizationId_idx" ON "ai_telephony"."transcription_jobs"("organizationId");

-- CreateIndex
CREATE INDEX "transcription_jobs_callAttemptId_idx" ON "ai_telephony"."transcription_jobs"("callAttemptId");

-- CreateIndex
CREATE INDEX "call_transcripts_transcriptionJobId_idx" ON "ai_telephony"."call_transcripts"("transcriptionJobId");

-- CreateIndex
CREATE INDEX "call_summaries_organizationId_idx" ON "ai_telephony"."call_summaries"("organizationId");

-- CreateIndex
CREATE INDEX "call_summaries_callAttemptId_idx" ON "ai_telephony"."call_summaries"("callAttemptId");

-- CreateIndex
CREATE INDEX "sentiment_analyses_organizationId_idx" ON "ai_telephony"."sentiment_analyses"("organizationId");

-- CreateIndex
CREATE INDEX "sentiment_analyses_callAttemptId_idx" ON "ai_telephony"."sentiment_analyses"("callAttemptId");

-- CreateIndex
CREATE INDEX "quality_scores_organizationId_idx" ON "ai_telephony"."quality_scores"("organizationId");

-- CreateIndex
CREATE INDEX "quality_scores_callAttemptId_idx" ON "ai_telephony"."quality_scores"("callAttemptId");

-- CreateIndex
CREATE INDEX "banks_organizationId_idx" ON "banks"."banks"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "banks_organizationId_code_key" ON "banks"."banks"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "banks_organizationId_name_key" ON "banks"."banks"("organizationId", "name");

-- CreateIndex
CREATE INDEX "bank_branches_bankId_idx" ON "banks"."bank_branches"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_branches_bankId_code_key" ON "banks"."bank_branches"("bankId", "code");

-- CreateIndex
CREATE INDEX "commission_policy_versions_bankId_idx" ON "banks"."commission_policy_versions"("bankId");

-- CreateIndex
CREATE INDEX "commission_policy_versions_loanProductId_idx" ON "banks"."commission_policy_versions"("loanProductId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_policy_versions_bankId_loanProductId_versionNumb_key" ON "banks"."commission_policy_versions"("bankId", "loanProductId", "versionNumber");

-- CreateIndex
CREATE INDEX "campaigns_organizationId_idx" ON "campaigns"."campaigns"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_assignments_campaignId_idx" ON "campaigns"."campaign_assignments"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_assignment_allocations_campaignAssignmentId_userId_key" ON "campaigns"."campaign_assignment_allocations"("campaignAssignmentId", "userId");

-- CreateIndex
CREATE INDEX "customers_organizationId_idx" ON "customers"."customers"("organizationId");

-- CreateIndex
CREATE INDEX "customers_mergedIntoCustomerId_idx" ON "customers"."customers"("mergedIntoCustomerId");

-- CreateIndex
CREATE INDEX "customer_identifiers_customerId_idx" ON "customers"."customer_identifiers"("customerId");

-- CreateIndex
CREATE INDEX "customer_identifiers_valueNormalized_idx" ON "customers"."customer_identifiers"("valueNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identifiers_type_valueHash_key" ON "customers"."customer_identifiers"("type", "valueHash");

-- CreateIndex
CREATE INDEX "customer_duplicate_candidates_customerBId_idx" ON "customers"."customer_duplicate_candidates"("customerBId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_duplicate_candidates_customerAId_customerBId_key" ON "customers"."customer_duplicate_candidates"("customerAId", "customerBId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_merges_mergedAwayCustomerId_key" ON "customers"."customer_merges"("mergedAwayCustomerId");

-- CreateIndex
CREATE INDEX "customer_merges_survivingCustomerId_idx" ON "customers"."customer_merges"("survivingCustomerId");

-- CreateIndex
CREATE INDEX "customer_merges_duplicateCandidateId_idx" ON "customers"."customer_merges"("duplicateCandidateId");

-- CreateIndex
CREATE INDEX "disbursements_organizationId_idx" ON "disbursements"."disbursements"("organizationId");

-- CreateIndex
CREATE INDEX "disbursements_loanApplicationId_idx" ON "disbursements"."disbursements"("loanApplicationId");

-- CreateIndex
CREATE INDEX "disbursements_loanAccountId_idx" ON "disbursements"."disbursements"("loanAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_bankId_bankReferenceNumber_key" ON "disbursements"."disbursements"("bankId", "bankReferenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_loanApplicationId_trancheNumber_key" ON "disbursements"."disbursements"("loanApplicationId", "trancheNumber");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_disbursementId_key" ON "disbursements"."commissions"("disbursementId");

-- CreateIndex
CREATE INDEX "commissions_commissionPolicyVersionId_idx" ON "disbursements"."commissions"("commissionPolicyVersionId");

-- CreateIndex
CREATE INDEX "storage_locations_organizationId_idx" ON "documents"."storage_locations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "upload_sessions_sessionToken_key" ON "documents"."upload_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "upload_sessions_organizationId_idx" ON "documents"."upload_sessions"("organizationId");

-- CreateIndex
CREATE INDEX "attachments_organizationId_idx" ON "documents"."attachments"("organizationId");

-- CreateIndex
CREATE INDEX "attachments_uploadSessionId_idx" ON "documents"."attachments"("uploadSessionId");

-- CreateIndex
CREATE INDEX "attachments_storageLocationId_idx" ON "documents"."attachments"("storageLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "document_categories_organizationId_name_key" ON "documents"."document_categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "document_types_documentCategoryId_idx" ON "documents"."document_types"("documentCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_organizationId_name_key" ON "documents"."document_types"("organizationId", "name");

-- CreateIndex
CREATE INDEX "documents_organizationId_idx" ON "documents"."documents"("organizationId");

-- CreateIndex
CREATE INDEX "documents_documentTypeId_idx" ON "documents"."documents"("documentTypeId");

-- CreateIndex
CREATE INDEX "documents_ownerType_ownerId_idx" ON "documents"."documents"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "document_versions_attachmentId_idx" ON "documents"."document_versions"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "documents"."document_versions"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "ocr_jobs_documentVersionId_idx" ON "documents"."ocr_jobs"("documentVersionId");

-- CreateIndex
CREATE INDEX "extracted_fields_ocrJobId_idx" ON "documents"."extracted_fields"("ocrJobId");

-- CreateIndex
CREATE INDEX "document_verifications_organizationId_idx" ON "documents"."document_verifications"("organizationId");

-- CreateIndex
CREATE INDEX "document_verifications_documentVersionId_idx" ON "documents"."document_verifications"("documentVersionId");

-- CreateIndex
CREATE INDEX "document_checklist_templates_organizationId_idx" ON "documents"."document_checklist_templates"("organizationId");

-- CreateIndex
CREATE INDEX "document_checklist_templates_loanProductId_idx" ON "documents"."document_checklist_templates"("loanProductId");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_items_documentChecklistTemplateId_docume_key" ON "documents"."checklist_template_items"("documentChecklistTemplateId", "documentTypeId");

-- CreateIndex
CREATE INDEX "document_checklists_organizationId_idx" ON "documents"."document_checklists"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "document_checklists_ownerType_ownerId_key" ON "documents"."document_checklists"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "checklist_items_fulfillingDocumentId_idx" ON "documents"."checklist_items"("fulfillingDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_documentChecklistId_documentTypeId_key" ON "documents"."checklist_items"("documentChecklistId", "documentTypeId");

-- CreateIndex
CREATE INDEX "document_bundles_organizationId_idx" ON "documents"."document_bundles"("organizationId");

-- CreateIndex
CREATE INDEX "document_bundles_documentChecklistId_idx" ON "documents"."document_bundles"("documentChecklistId");

-- CreateIndex
CREATE INDEX "document_bundles_ownerType_ownerId_idx" ON "documents"."document_bundles"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "bundle_members_checklistItemId_idx" ON "documents"."bundle_members"("checklistItemId");

-- CreateIndex
CREATE INDEX "bundle_members_pinnedDocumentVersionId_idx" ON "documents"."bundle_members"("pinnedDocumentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_members_documentBundleId_documentId_key" ON "documents"."bundle_members"("documentBundleId", "documentId");

-- CreateIndex
CREATE INDEX "retention_policies_organizationId_idx" ON "documents"."retention_policies"("organizationId");

-- CreateIndex
CREATE INDEX "legal_holds_documentId_idx" ON "documents"."legal_holds"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_sharings_accessToken_key" ON "documents"."document_sharings"("accessToken");

-- CreateIndex
CREATE INDEX "document_sharings_organizationId_idx" ON "documents"."document_sharings"("organizationId");

-- CreateIndex
CREATE INDEX "document_sharings_documentId_idx" ON "documents"."document_sharings"("documentId");

-- CreateIndex
CREATE INDEX "document_sharings_documentBundleId_idx" ON "documents"."document_sharings"("documentBundleId");

-- CreateIndex
CREATE INDEX "share_access_log_entries_documentSharingId_idx" ON "documents"."share_access_log_entries"("documentSharingId");

-- CreateIndex
CREATE INDEX "audit_trail_organizationId_idx" ON "documents"."audit_trail"("organizationId");

-- CreateIndex
CREATE INDEX "audit_trail_targetType_targetId_idx" ON "documents"."audit_trail"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_trail_occurredAt_idx" ON "documents"."audit_trail"("occurredAt");

-- CreateIndex
CREATE INDEX "follow_ups_organizationId_idx" ON "follow_ups"."follow_ups"("organizationId");

-- CreateIndex
CREATE INDEX "follow_ups_leadId_idx" ON "follow_ups"."follow_ups"("leadId");

-- CreateIndex
CREATE INDEX "follow_ups_currentAssigneeUserId_idx" ON "follow_ups"."follow_ups"("currentAssigneeUserId");

-- CreateIndex
CREATE INDEX "follow_ups_status_scheduledFor_idx" ON "follow_ups"."follow_ups"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "follow_up_reassignments_followUpId_idx" ON "follow_ups"."follow_up_reassignments"("followUpId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_importRowId_key" ON "leads"."leads"("importRowId");

-- CreateIndex
CREATE INDEX "leads_organizationId_idx" ON "leads"."leads"("organizationId");

-- CreateIndex
CREATE INDEX "leads_customerId_idx" ON "leads"."leads"("customerId");

-- CreateIndex
CREATE INDEX "leads_currentAssigneeUserId_idx" ON "leads"."leads"("currentAssigneeUserId");

-- CreateIndex
CREATE INDEX "leads_currentStageId_idx" ON "leads"."leads"("currentStageId");

-- CreateIndex
CREATE INDEX "leads_campaignId_idx" ON "leads"."leads"("campaignId");

-- CreateIndex
CREATE INDEX "lead_stages_organizationId_idx" ON "leads"."lead_stages"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_stages_organizationId_name_key" ON "leads"."lead_stages"("organizationId", "name");

-- CreateIndex
CREATE INDEX "lost_reasons_organizationId_idx" ON "leads"."lost_reasons"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "lost_reasons_organizationId_name_key" ON "leads"."lost_reasons"("organizationId", "name");

-- CreateIndex
CREATE INDEX "lead_sources_organizationId_idx" ON "leads"."lead_sources"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_sources_organizationId_name_key" ON "leads"."lead_sources"("organizationId", "name");

-- CreateIndex
CREATE INDEX "call_feedback_statuses_organizationId_idx" ON "leads"."call_feedback_statuses"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "call_feedback_statuses_organizationId_name_key" ON "leads"."call_feedback_statuses"("organizationId", "name");

-- CreateIndex
CREATE INDEX "lead_call_feedback_leadId_idx" ON "leads"."lead_call_feedback"("leadId");

-- CreateIndex
CREATE INDEX "lead_call_feedback_callFeedbackStatusId_idx" ON "leads"."lead_call_feedback"("callFeedbackStatusId");

-- CreateIndex
CREATE INDEX "lead_call_feedback_callAttemptId_idx" ON "leads"."lead_call_feedback"("callAttemptId");

-- CreateIndex
CREATE INDEX "lead_assignments_leadId_idx" ON "leads"."lead_assignments"("leadId");

-- CreateIndex
CREATE INDEX "lead_assignments_assignedToUserId_idx" ON "leads"."lead_assignments"("assignedToUserId");

-- CreateIndex
CREATE INDEX "lead_notes_leadId_idx" ON "leads"."lead_notes"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_organizationId_name_key" ON "leads"."tags"("organizationId", "name");

-- CreateIndex
CREATE INDEX "lead_tags_tagId_idx" ON "leads"."lead_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_organizationId_name_key" ON "leads"."custom_field_definitions"("organizationId", "name");

-- CreateIndex
CREATE INDEX "lead_custom_field_values_customFieldDefinitionId_idx" ON "leads"."lead_custom_field_values"("customFieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_custom_field_values_leadId_customFieldDefinitionId_key" ON "leads"."lead_custom_field_values"("leadId", "customFieldDefinitionId");

-- CreateIndex
CREATE INDEX "saved_views_ownerUserId_idx" ON "leads"."saved_views"("ownerUserId");

-- CreateIndex
CREATE INDEX "import_batches_organizationId_idx" ON "leads"."import_batches"("organizationId");

-- CreateIndex
CREATE INDEX "import_batches_status_idx" ON "leads"."import_batches"("status");

-- CreateIndex
CREATE INDEX "import_rows_importBatchId_idx" ON "leads"."import_rows"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_importBatchId_rowNumber_key" ON "leads"."import_rows"("importBatchId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "duplicate_matches_importRowId_key" ON "leads"."duplicate_matches"("importRowId");

-- CreateIndex
CREATE INDEX "duplicate_matches_matchedCustomerId_idx" ON "leads"."duplicate_matches"("matchedCustomerId");

-- CreateIndex
CREATE INDEX "duplicate_match_existing_leads_existingLeadId_idx" ON "leads"."duplicate_match_existing_leads"("existingLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "loan_statuses_organizationId_name_key" ON "loan_accounts"."loan_statuses"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "loan_accounts_originatingApplicationId_key" ON "loan_accounts"."loan_accounts"("originatingApplicationId");

-- CreateIndex
CREATE INDEX "loan_accounts_organizationId_idx" ON "loan_accounts"."loan_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "loan_accounts_customerId_idx" ON "loan_accounts"."loan_accounts"("customerId");

-- CreateIndex
CREATE INDEX "loan_accounts_bankId_idx" ON "loan_accounts"."loan_accounts"("bankId");

-- CreateIndex
CREATE INDEX "loan_accounts_loanStatusId_idx" ON "loan_accounts"."loan_accounts"("loanStatusId");

-- CreateIndex
CREATE INDEX "emi_schedules_loanAccountId_idx" ON "loan_accounts"."emi_schedules"("loanAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "emi_schedules_loanAccountId_versionNumber_key" ON "loan_accounts"."emi_schedules"("loanAccountId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "emi_pay_statuses_organizationId_name_key" ON "loan_accounts"."emi_pay_statuses"("organizationId", "name");

-- CreateIndex
CREATE INDEX "emi_installments_emiScheduleId_idx" ON "loan_accounts"."emi_installments"("emiScheduleId");

-- CreateIndex
CREATE INDEX "emi_installments_payStatusId_idx" ON "loan_accounts"."emi_installments"("payStatusId");

-- CreateIndex
CREATE INDEX "emi_installments_dueDate_idx" ON "loan_accounts"."emi_installments"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "emi_installments_emiScheduleId_installmentNumber_key" ON "loan_accounts"."emi_installments"("emiScheduleId", "installmentNumber");

-- CreateIndex
CREATE INDEX "foreclosures_loanAccountId_idx" ON "loan_accounts"."foreclosures"("loanAccountId");

-- CreateIndex
CREATE INDEX "application_statuses_organizationId_idx" ON "loan_applications"."application_statuses"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "application_statuses_organizationId_name_key" ON "loan_applications"."application_statuses"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "loan_applications_loanOfferId_key" ON "loan_applications"."loan_applications"("loanOfferId");

-- CreateIndex
CREATE INDEX "loan_applications_organizationId_idx" ON "loan_applications"."loan_applications"("organizationId");

-- CreateIndex
CREATE INDEX "loan_applications_customerId_idx" ON "loan_applications"."loan_applications"("customerId");

-- CreateIndex
CREATE INDEX "loan_applications_leadId_idx" ON "loan_applications"."loan_applications"("leadId");

-- CreateIndex
CREATE INDEX "loan_applications_loanProductId_idx" ON "loan_applications"."loan_applications"("loanProductId");

-- CreateIndex
CREATE INDEX "loan_applications_applicationStatusId_idx" ON "loan_applications"."loan_applications"("applicationStatusId");

-- CreateIndex
CREATE INDEX "loan_applications_originatingLoanAccountId_idx" ON "loan_applications"."loan_applications"("originatingLoanAccountId");

-- CreateIndex
CREATE INDEX "eligibility_snapshots_loanApplicationId_idx" ON "loan_applications"."eligibility_snapshots"("loanApplicationId");

-- CreateIndex
CREATE INDEX "eligibility_snapshots_customerId_idx" ON "loan_applications"."eligibility_snapshots"("customerId");

-- CreateIndex
CREATE INDEX "co_applicants_loanApplicationId_idx" ON "loan_applications"."co_applicants"("loanApplicationId");

-- CreateIndex
CREATE INDEX "co_applicants_customerId_idx" ON "loan_applications"."co_applicants"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "co_applicants_loanApplicationId_customerId_key" ON "loan_applications"."co_applicants"("loanApplicationId", "customerId");

-- CreateIndex
CREATE INDEX "loan_offers_organizationId_idx" ON "loan_applications"."loan_offers"("organizationId");

-- CreateIndex
CREATE INDEX "loan_offers_leadId_idx" ON "loan_applications"."loan_offers"("leadId");

-- CreateIndex
CREATE INDEX "loan_offers_bankId_idx" ON "loan_applications"."loan_offers"("bankId");

-- CreateIndex
CREATE INDEX "loan_offers_loanProductId_idx" ON "loan_applications"."loan_offers"("loanProductId");

-- CreateIndex
CREATE UNIQUE INDEX "loan_product_types_organizationId_name_key" ON "loan_products"."loan_product_types"("organizationId", "name");

-- CreateIndex
CREATE INDEX "loan_products_organizationId_idx" ON "loan_products"."loan_products"("organizationId");

-- CreateIndex
CREATE INDEX "loan_products_bankId_idx" ON "loan_products"."loan_products"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "loan_products_bankId_loanProductTypeId_variant_key" ON "loan_products"."loan_products"("bankId", "loanProductTypeId", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_organizationId_code_key" ON "notifications"."notification_templates"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_versions_templateId_versionNumber_key" ON "notifications"."notification_template_versions"("templateId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channels_organizationId_channelType_key" ON "notifications"."notification_channels"("organizationId", "channelType");

-- CreateIndex
CREATE INDEX "providers_organizationId_idx" ON "notifications"."providers"("organizationId");

-- CreateIndex
CREATE INDEX "providers_channelId_idx" ON "notifications"."providers"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_failover_policies_notificationChannelId_versionNum_key" ON "notifications"."provider_failover_policies"("notificationChannelId", "versionNumber");

-- CreateIndex
CREATE INDEX "provider_health_checks_providerId_idx" ON "notifications"."provider_health_checks"("providerId");

-- CreateIndex
CREATE INDEX "notification_preferences_recipientType_recipientId_idx" ON "notifications"."notification_preferences"("recipientType", "recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_recipientType_recipientId_eventCat_key" ON "notifications"."notification_preferences"("recipientType", "recipientId", "eventCategory", "channelType");

-- CreateIndex
CREATE UNIQUE INDEX "notification_subscriptions_recipientType_recipientId_topic_key" ON "notifications"."notification_subscriptions"("recipientType", "recipientId", "topic");

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"."notifications"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_recipientType_recipientId_idx" ON "notifications"."notifications"("recipientType", "recipientId");

-- CreateIndex
CREATE INDEX "notifications_batchId_idx" ON "notifications"."notifications"("batchId");

-- CreateIndex
CREATE INDEX "notifications_broadcastId_idx" ON "notifications"."notifications"("broadcastId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_queues_organizationId_channelType_priority_key" ON "notifications"."notification_queues"("organizationId", "channelType", "priority");

-- CreateIndex
CREATE INDEX "notification_queue_entries_notificationQueueId_idx" ON "notifications"."notification_queue_entries"("notificationQueueId");

-- CreateIndex
CREATE INDEX "notification_queue_entries_notificationId_idx" ON "notifications"."notification_queue_entries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_queue_entries_status_scheduledFor_idx" ON "notifications"."notification_queue_entries"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notifications"."notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_providerId_idx" ON "notifications"."notification_deliveries"("providerId");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notifications"."notification_deliveries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_retries_notificationDeliveryId_attemptNumber_key" ON "notifications"."notification_retries"("notificationDeliveryId", "attemptNumber");

-- CreateIndex
CREATE INDEX "broadcasts_organizationId_idx" ON "notifications"."broadcasts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_batches_broadcastId_key" ON "notifications"."notification_batches"("broadcastId");

-- CreateIndex
CREATE INDEX "notification_batches_organizationId_idx" ON "notifications"."notification_batches"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_batch_items_resultingNotificationId_key" ON "notifications"."notification_batch_items"("resultingNotificationId");

-- CreateIndex
CREATE INDEX "notification_batch_items_notificationBatchId_idx" ON "notifications"."notification_batch_items"("notificationBatchId");

-- CreateIndex
CREATE INDEX "communication_log_organizationId_idx" ON "notifications"."communication_log"("organizationId");

-- CreateIndex
CREATE INDEX "communication_log_notificationId_idx" ON "notifications"."communication_log"("notificationId");

-- CreateIndex
CREATE INDEX "communication_log_occurredAt_idx" ON "notifications"."communication_log"("occurredAt");

-- CreateIndex
CREATE INDEX "event_trigger_subscriptions_organizationId_idx" ON "notifications"."event_trigger_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "event_trigger_subscriptions_domainEventType_idx" ON "notifications"."event_trigger_subscriptions"("domainEventType");

-- CreateIndex
CREATE INDEX "event_trigger_subscriptions_templateId_idx" ON "notifications"."event_trigger_subscriptions"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organization"."organizations"("code");

-- CreateIndex
CREATE INDEX "regions_organizationId_idx" ON "organization"."regions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "regions_organizationId_code_key" ON "organization"."regions"("organizationId", "code");

-- CreateIndex
CREATE INDEX "branches_organizationId_idx" ON "organization"."branches"("organizationId");

-- CreateIndex
CREATE INDEX "branches_regionId_idx" ON "organization"."branches"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organizationId_code_key" ON "organization"."branches"("organizationId", "code");

-- CreateIndex
CREATE INDEX "departments_organizationId_idx" ON "organization"."departments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organizationId_code_key" ON "organization"."departments"("organizationId", "code");

-- CreateIndex
CREATE INDEX "teams_organizationId_idx" ON "organization"."teams"("organizationId");

-- CreateIndex
CREATE INDEX "teams_branchId_idx" ON "organization"."teams"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organizationId_code_key" ON "organization"."teams"("organizationId", "code");

-- CreateIndex
CREATE INDEX "user_assignment_history_userId_idx" ON "organization"."user_assignment_history"("userId");

-- CreateIndex
CREATE INDEX "user_assignment_history_teamId_idx" ON "organization"."user_assignment_history"("teamId");

-- CreateIndex
CREATE INDEX "user_assignment_history_branchId_idx" ON "organization"."user_assignment_history"("branchId");

-- CreateIndex
CREATE INDEX "user_assignment_history_departmentId_idx" ON "organization"."user_assignment_history"("departmentId");

-- CreateIndex
CREATE INDEX "holiday_calendars_organizationId_idx" ON "organization"."holiday_calendars"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "holiday_calendars_organizationId_branchId_year_key" ON "organization"."holiday_calendars"("organizationId", "branchId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "holiday_calendar_entries_holidayCalendarId_date_key" ON "organization"."holiday_calendar_entries"("holidayCalendarId", "date");

-- CreateIndex
CREATE INDEX "working_hours_policies_organizationId_idx" ON "organization"."working_hours_policies"("organizationId");

-- CreateIndex
CREATE INDEX "working_hours_policies_branchId_idx" ON "organization"."working_hours_policies"("branchId");

-- CreateIndex
CREATE INDEX "working_hours_slots_workingHoursPolicyId_idx" ON "organization"."working_hours_slots"("workingHoursPolicyId");

-- CreateIndex
CREATE INDEX "escalation_rules_organizationId_idx" ON "organization"."escalation_rules"("organizationId");

-- CreateIndex
CREATE INDEX "escalation_rules_branchId_idx" ON "organization"."escalation_rules"("branchId");

-- CreateIndex
CREATE INDEX "roles_organizationId_idx" ON "rbac"."roles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizationId_name_key" ON "rbac"."roles"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "rbac"."permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "rbac"."permissions"("module");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "rbac"."role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "rbac"."user_roles"("roleId");

-- CreateIndex
CREATE INDEX "analytics_datasets_organizationId_idx" ON "reports"."analytics_datasets"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_datasets_organizationId_name_versionNumber_key" ON "reports"."analytics_datasets"("organizationId", "name", "versionNumber");

-- CreateIndex
CREATE INDEX "metric_definitions_organizationId_idx" ON "reports"."metric_definitions"("organizationId");

-- CreateIndex
CREATE INDEX "metric_definitions_domain_idx" ON "reports"."metric_definitions"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_organizationId_name_key" ON "reports"."metric_definitions"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definition_versions_metricDefinitionId_versionNumber_key" ON "reports"."metric_definition_versions"("metricDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "kpis_metricDefinitionId_idx" ON "reports"."kpis"("metricDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "kpis_organizationId_name_key" ON "reports"."kpis"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_target_versions_kpiId_versionNumber_key" ON "reports"."kpi_target_versions"("kpiId", "versionNumber");

-- CreateIndex
CREATE INDEX "analytics_snapshots_organizationId_idx" ON "reports"."analytics_snapshots"("organizationId");

-- CreateIndex
CREATE INDEX "analytics_snapshots_metricDefinitionId_periodStart_idx" ON "reports"."analytics_snapshots"("metricDefinitionId", "periodStart");

-- CreateIndex
CREATE INDEX "dashboards_organizationId_idx" ON "reports"."dashboards"("organizationId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboardId_idx" ON "reports"."dashboard_widgets"("dashboardId");

-- CreateIndex
CREATE UNIQUE INDEX "report_templates_organizationId_name_versionNumber_key" ON "reports"."report_templates"("organizationId", "name", "versionNumber");

-- CreateIndex
CREATE INDEX "saved_reports_ownerUserId_idx" ON "reports"."saved_reports"("ownerUserId");

-- CreateIndex
CREATE INDEX "saved_reports_reportTemplateId_idx" ON "reports"."saved_reports"("reportTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_reports_savedReportId_key" ON "reports"."scheduled_reports"("savedReportId");

-- CreateIndex
CREATE INDEX "report_executions_organizationId_idx" ON "reports"."report_executions"("organizationId");

-- CreateIndex
CREATE INDEX "report_executions_reportTemplateId_idx" ON "reports"."report_executions"("reportTemplateId");

-- CreateIndex
CREATE INDEX "report_executions_savedReportId_idx" ON "reports"."report_executions"("savedReportId");

-- CreateIndex
CREATE INDEX "report_executions_scheduledReportId_idx" ON "reports"."report_executions"("scheduledReportId");

-- CreateIndex
CREATE INDEX "export_jobs_organizationId_idx" ON "reports"."export_jobs"("organizationId");

-- CreateIndex
CREATE INDEX "export_jobs_reportExecutionId_idx" ON "reports"."export_jobs"("reportExecutionId");

-- CreateIndex
CREATE INDEX "trunks_organizationId_idx" ON "telephony"."trunks"("organizationId");

-- CreateIndex
CREATE INDEX "telephony_lines_simInventoryId_idx" ON "telephony"."telephony_lines"("simInventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "telephony_lines_trunkId_lineIdentifier_key" ON "telephony"."telephony_lines"("trunkId", "lineIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "sim_inventory_msisdn_key" ON "telephony"."sim_inventory"("msisdn");

-- CreateIndex
CREATE INDEX "sim_inventory_organizationId_idx" ON "telephony"."sim_inventory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "did_numbers_number_key" ON "telephony"."did_numbers"("number");

-- CreateIndex
CREATE INDEX "did_numbers_organizationId_idx" ON "telephony"."did_numbers"("organizationId");

-- CreateIndex
CREATE INDEX "caller_ids_trunkId_idx" ON "telephony"."caller_ids"("trunkId");

-- CreateIndex
CREATE INDEX "caller_ids_telephonyLineId_idx" ON "telephony"."caller_ids"("telephonyLineId");

-- CreateIndex
CREATE INDEX "caller_ids_dialerCampaignId_idx" ON "telephony"."caller_ids"("dialerCampaignId");

-- CreateIndex
CREATE INDEX "extensions_userId_idx" ON "telephony"."extensions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "extensions_organizationId_extensionNumber_key" ON "telephony"."extensions"("organizationId", "extensionNumber");

-- CreateIndex
CREATE INDEX "call_attempts_organizationId_idx" ON "telephony"."call_attempts"("organizationId");

-- CreateIndex
CREATE INDEX "call_attempts_leadId_idx" ON "telephony"."call_attempts"("leadId");

-- CreateIndex
CREATE INDEX "call_attempts_customerId_idx" ON "telephony"."call_attempts"("customerId");

-- CreateIndex
CREATE INDEX "call_attempts_extensionId_idx" ON "telephony"."call_attempts"("extensionId");

-- CreateIndex
CREATE INDEX "call_attempts_status_idx" ON "telephony"."call_attempts"("status");

-- CreateIndex
CREATE INDEX "call_attempts_initiatedAt_idx" ON "telephony"."call_attempts"("initiatedAt");

-- CreateIndex
CREATE INDEX "call_recordings_callAttemptId_idx" ON "telephony"."call_recordings"("callAttemptId");

-- CreateIndex
CREATE INDEX "call_recording_access_log_callRecordingId_idx" ON "telephony"."call_recording_access_log"("callRecordingId");

-- CreateIndex
CREATE INDEX "call_monitoring_sessions_callAttemptId_idx" ON "telephony"."call_monitoring_sessions"("callAttemptId");

-- CreateIndex
CREATE INDEX "call_monitoring_transitions_callMonitoringSessionId_idx" ON "telephony"."call_monitoring_transitions"("callMonitoringSessionId");

-- CreateIndex
CREATE INDEX "call_transfers_callAttemptId_idx" ON "telephony"."call_transfers"("callAttemptId");

-- CreateIndex
CREATE INDEX "call_conferences_callAttemptId_idx" ON "telephony"."call_conferences"("callAttemptId");

-- CreateIndex
CREATE INDEX "ivrs_organizationId_idx" ON "telephony"."ivrs"("organizationId");

-- CreateIndex
CREATE INDEX "ivr_flow_versions_ivrId_idx" ON "telephony"."ivr_flow_versions"("ivrId");

-- CreateIndex
CREATE UNIQUE INDEX "ivr_flow_versions_ivrId_versionNumber_key" ON "telephony"."ivr_flow_versions"("ivrId", "versionNumber");

-- CreateIndex
CREATE INDEX "call_queues_organizationId_idx" ON "telephony"."call_queues"("organizationId");

-- CreateIndex
CREATE INDEX "queue_memberships_callQueueId_idx" ON "telephony"."queue_memberships"("callQueueId");

-- CreateIndex
CREATE INDEX "queue_memberships_userId_idx" ON "telephony"."queue_memberships"("userId");

-- CreateIndex
CREATE INDEX "agent_sessions_organizationId_idx" ON "telephony"."agent_sessions"("organizationId");

-- CreateIndex
CREATE INDEX "agent_sessions_userId_idx" ON "telephony"."agent_sessions"("userId");

-- CreateIndex
CREATE INDEX "agent_sessions_extensionId_idx" ON "telephony"."agent_sessions"("extensionId");

-- CreateIndex
CREATE INDEX "agent_status_histories_agentSessionId_idx" ON "telephony"."agent_status_histories"("agentSessionId");

-- CreateIndex
CREATE INDEX "agent_status_histories_changedAt_idx" ON "telephony"."agent_status_histories"("changedAt");

-- CreateIndex
CREATE INDEX "queue_participations_agentSessionId_idx" ON "telephony"."queue_participations"("agentSessionId");

-- CreateIndex
CREATE INDEX "queue_participations_callQueueId_idx" ON "telephony"."queue_participations"("callQueueId");

-- CreateIndex
CREATE INDEX "dialer_campaigns_organizationId_idx" ON "telephony"."dialer_campaigns"("organizationId");

-- CreateIndex
CREATE INDEX "dialer_campaigns_crmCampaignId_idx" ON "telephony"."dialer_campaigns"("crmCampaignId");

-- CreateIndex
CREATE INDEX "dialer_queues_dialerCampaignId_idx" ON "telephony"."dialer_queues"("dialerCampaignId");

-- CreateIndex
CREATE INDEX "dialer_queue_entries_dialerQueueId_idx" ON "telephony"."dialer_queue_entries"("dialerQueueId");

-- CreateIndex
CREATE INDEX "dialer_queue_entries_leadId_idx" ON "telephony"."dialer_queue_entries"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "dialer_retries_dialerQueueEntryId_attemptNumber_key" ON "telephony"."dialer_retries"("dialerQueueEntryId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"."users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"."users"("organizationId");

-- CreateIndex
CREATE INDEX "users_currentTeamId_idx" ON "users"."users"("currentTeamId");

-- CreateIndex
CREATE INDEX "users_currentBranchId_idx" ON "users"."users"("currentBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "users_organizationId_employeeCode_key" ON "users"."users"("organizationId", "employeeCode");

-- CreateIndex
CREATE INDEX "login_attempts_userId_idx" ON "users"."login_attempts"("userId");

-- CreateIndex
CREATE INDEX "login_attempts_emailTried_idx" ON "users"."login_attempts"("emailTried");

-- CreateIndex
CREATE INDEX "login_attempts_occurredAt_idx" ON "users"."login_attempts"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "users"."api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_ownerUserId_idx" ON "users"."api_keys"("ownerUserId");

-- AddForeignKey
ALTER TABLE "ai_core"."ai_models" ADD CONSTRAINT "ai_models_aiProviderId_fkey" FOREIGN KEY ("aiProviderId") REFERENCES "ai_core"."ai_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_model_capabilities" ADD CONSTRAINT "ai_model_capabilities_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_core"."ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_model_pricing_versions" ADD CONSTRAINT "ai_model_pricing_versions_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_core"."ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_agent_capabilities" ADD CONSTRAINT "ai_agent_capabilities_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "ai_core"."ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_agent_prompt_templates" ADD CONSTRAINT "ai_agent_prompt_templates_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "ai_core"."ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_agent_prompt_templates" ADD CONSTRAINT "ai_agent_prompt_templates_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "ai_core"."prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_tasks" ADD CONSTRAINT "ai_tasks_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "ai_core"."ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_tasks" ADD CONSTRAINT "ai_tasks_aiWorkflowId_fkey" FOREIGN KEY ("aiWorkflowId") REFERENCES "ai_core"."ai_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_jobs" ADD CONSTRAINT "ai_jobs_aiTaskId_fkey" FOREIGN KEY ("aiTaskId") REFERENCES "ai_core"."ai_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_jobs" ADD CONSTRAINT "ai_jobs_aiProviderId_fkey" FOREIGN KEY ("aiProviderId") REFERENCES "ai_core"."ai_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_jobs" ADD CONSTRAINT "ai_jobs_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_core"."ai_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_jobs" ADD CONSTRAINT "ai_jobs_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "ai_core"."prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_jobs" ADD CONSTRAINT "ai_jobs_retryOfJobId_fkey" FOREIGN KEY ("retryOfJobId") REFERENCES "ai_core"."ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_results" ADD CONSTRAINT "ai_results_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "ai_core"."ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."prompt_versions" ADD CONSTRAINT "prompt_versions_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "ai_core"."prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."prompt_variables" ADD CONSTRAINT "prompt_variables_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "ai_core"."prompt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."token_usages" ADD CONSTRAINT "token_usages_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "ai_core"."ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_core"."ai_costs" ADD CONSTRAINT "ai_costs_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "ai_core"."ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_documents"."ocr_results" ADD CONSTRAINT "ocr_results_ocrRequestId_fkey" FOREIGN KEY ("ocrRequestId") REFERENCES "ai_documents"."ocr_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_documents"."extracted_entities" ADD CONSTRAINT "extracted_entities_ocrResultId_fkey" FOREIGN KEY ("ocrResultId") REFERENCES "ai_documents"."ocr_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_governance"."safety_policy_versions" ADD CONSTRAINT "safety_policy_versions_safetyPolicyId_fkey" FOREIGN KEY ("safetyPolicyId") REFERENCES "ai_governance"."safety_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_governance"."feedback" ADD CONSTRAINT "feedback_aiExperimentId_fkey" FOREIGN KEY ("aiExperimentId") REFERENCES "ai_governance"."ai_experiments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_governance"."feedback" ADD CONSTRAINT "feedback_aiExperimentVariantId_fkey" FOREIGN KEY ("aiExperimentVariantId") REFERENCES "ai_governance"."ai_experiment_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_governance"."ai_experiment_variants" ADD CONSTRAINT "ai_experiment_variants_aiExperimentId_fkey" FOREIGN KEY ("aiExperimentId") REFERENCES "ai_governance"."ai_experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_telephony"."call_transcripts" ADD CONSTRAINT "call_transcripts_transcriptionJobId_fkey" FOREIGN KEY ("transcriptionJobId") REFERENCES "ai_telephony"."transcription_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_telephony"."call_summaries" ADD CONSTRAINT "call_summaries_callTranscriptId_fkey" FOREIGN KEY ("callTranscriptId") REFERENCES "ai_telephony"."call_transcripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banks"."bank_branches" ADD CONSTRAINT "bank_branches_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"."banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banks"."commission_policy_versions" ADD CONSTRAINT "commission_policy_versions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"."banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns"."campaign_memberships" ADD CONSTRAINT "campaign_memberships_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns"."campaign_assignments" ADD CONSTRAINT "campaign_assignments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns"."campaign_assignment_allocations" ADD CONSTRAINT "campaign_assignment_allocations_campaignAssignmentId_fkey" FOREIGN KEY ("campaignAssignmentId") REFERENCES "campaigns"."campaign_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customers" ADD CONSTRAINT "customers_mergedIntoCustomerId_fkey" FOREIGN KEY ("mergedIntoCustomerId") REFERENCES "customers"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customer_identifiers" ADD CONSTRAINT "customer_identifiers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customer_identifiers" ADD CONSTRAINT "customer_identifiers_supersededByIdentifierId_fkey" FOREIGN KEY ("supersededByIdentifierId") REFERENCES "customers"."customer_identifiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customer_duplicate_candidates" ADD CONSTRAINT "customer_duplicate_candidates_customerAId_fkey" FOREIGN KEY ("customerAId") REFERENCES "customers"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customer_duplicate_candidates" ADD CONSTRAINT "customer_duplicate_candidates_customerBId_fkey" FOREIGN KEY ("customerBId") REFERENCES "customers"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customer_merges" ADD CONSTRAINT "customer_merges_survivingCustomerId_fkey" FOREIGN KEY ("survivingCustomerId") REFERENCES "customers"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customer_merges" ADD CONSTRAINT "customer_merges_mergedAwayCustomerId_fkey" FOREIGN KEY ("mergedAwayCustomerId") REFERENCES "customers"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers"."customer_merges" ADD CONSTRAINT "customer_merges_duplicateCandidateId_fkey" FOREIGN KEY ("duplicateCandidateId") REFERENCES "customers"."customer_duplicate_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements"."commissions" ADD CONSTRAINT "commissions_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "disbursements"."disbursements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."attachments" ADD CONSTRAINT "attachments_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "documents"."upload_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."attachments" ADD CONSTRAINT "attachments_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "documents"."storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_types" ADD CONSTRAINT "document_types_documentCategoryId_fkey" FOREIGN KEY ("documentCategoryId") REFERENCES "documents"."document_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."documents" ADD CONSTRAINT "documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "documents"."document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_versions" ADD CONSTRAINT "document_versions_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "documents"."attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_versions" ADD CONSTRAINT "document_versions_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "documents"."storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."ocr_jobs" ADD CONSTRAINT "ocr_jobs_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "documents"."document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."extracted_fields" ADD CONSTRAINT "extracted_fields_ocrJobId_fkey" FOREIGN KEY ("ocrJobId") REFERENCES "documents"."ocr_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_verifications" ADD CONSTRAINT "document_verifications_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "documents"."document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."checklist_template_items" ADD CONSTRAINT "checklist_template_items_documentChecklistTemplateId_fkey" FOREIGN KEY ("documentChecklistTemplateId") REFERENCES "documents"."document_checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."checklist_template_items" ADD CONSTRAINT "checklist_template_items_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "documents"."document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."checklist_items" ADD CONSTRAINT "checklist_items_documentChecklistId_fkey" FOREIGN KEY ("documentChecklistId") REFERENCES "documents"."document_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."checklist_items" ADD CONSTRAINT "checklist_items_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "documents"."document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."checklist_items" ADD CONSTRAINT "checklist_items_fulfillingDocumentId_fkey" FOREIGN KEY ("fulfillingDocumentId") REFERENCES "documents"."documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_bundles" ADD CONSTRAINT "document_bundles_documentChecklistId_fkey" FOREIGN KEY ("documentChecklistId") REFERENCES "documents"."document_checklists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."bundle_members" ADD CONSTRAINT "bundle_members_documentBundleId_fkey" FOREIGN KEY ("documentBundleId") REFERENCES "documents"."document_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."bundle_members" ADD CONSTRAINT "bundle_members_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"."documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."bundle_members" ADD CONSTRAINT "bundle_members_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "documents"."checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."bundle_members" ADD CONSTRAINT "bundle_members_pinnedDocumentVersionId_fkey" FOREIGN KEY ("pinnedDocumentVersionId") REFERENCES "documents"."document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."retention_policies" ADD CONSTRAINT "retention_policies_documentCategoryId_fkey" FOREIGN KEY ("documentCategoryId") REFERENCES "documents"."document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."retention_policies" ADD CONSTRAINT "retention_policies_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "documents"."document_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."legal_holds" ADD CONSTRAINT "legal_holds_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_sharings" ADD CONSTRAINT "document_sharings_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."document_sharings" ADD CONSTRAINT "document_sharings_documentBundleId_fkey" FOREIGN KEY ("documentBundleId") REFERENCES "documents"."document_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents"."share_access_log_entries" ADD CONSTRAINT "share_access_log_entries_documentSharingId_fkey" FOREIGN KEY ("documentSharingId") REFERENCES "documents"."document_sharings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups"."follow_up_reassignments" ADD CONSTRAINT "follow_up_reassignments_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "follow_ups"."follow_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."leads" ADD CONSTRAINT "leads_leadSourceId_fkey" FOREIGN KEY ("leadSourceId") REFERENCES "leads"."lead_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."leads" ADD CONSTRAINT "leads_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "leads"."lead_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."leads" ADD CONSTRAINT "leads_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "leads"."lost_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."leads" ADD CONSTRAINT "leads_importRowId_fkey" FOREIGN KEY ("importRowId") REFERENCES "leads"."import_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_call_feedback" ADD CONSTRAINT "lead_call_feedback_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_call_feedback" ADD CONSTRAINT "lead_call_feedback_callFeedbackStatusId_fkey" FOREIGN KEY ("callFeedbackStatusId") REFERENCES "leads"."call_feedback_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_assignments" ADD CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_notes" ADD CONSTRAINT "lead_notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_tags" ADD CONSTRAINT "lead_tags_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_tags" ADD CONSTRAINT "lead_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "leads"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_custom_field_values" ADD CONSTRAINT "lead_custom_field_values_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."lead_custom_field_values" ADD CONSTRAINT "lead_custom_field_values_customFieldDefinitionId_fkey" FOREIGN KEY ("customFieldDefinitionId") REFERENCES "leads"."custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."import_batches" ADD CONSTRAINT "import_batches_leadSourceId_fkey" FOREIGN KEY ("leadSourceId") REFERENCES "leads"."lead_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."import_rows" ADD CONSTRAINT "import_rows_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "leads"."import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."duplicate_matches" ADD CONSTRAINT "duplicate_matches_importRowId_fkey" FOREIGN KEY ("importRowId") REFERENCES "leads"."import_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."duplicate_match_existing_leads" ADD CONSTRAINT "duplicate_match_existing_leads_duplicateMatchId_fkey" FOREIGN KEY ("duplicateMatchId") REFERENCES "leads"."duplicate_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads"."duplicate_match_existing_leads" ADD CONSTRAINT "duplicate_match_existing_leads_existingLeadId_fkey" FOREIGN KEY ("existingLeadId") REFERENCES "leads"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_accounts"."loan_accounts" ADD CONSTRAINT "loan_accounts_loanStatusId_fkey" FOREIGN KEY ("loanStatusId") REFERENCES "loan_accounts"."loan_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_accounts"."emi_schedules" ADD CONSTRAINT "emi_schedules_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "loan_accounts"."loan_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_accounts"."emi_installments" ADD CONSTRAINT "emi_installments_emiScheduleId_fkey" FOREIGN KEY ("emiScheduleId") REFERENCES "loan_accounts"."emi_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_accounts"."emi_installments" ADD CONSTRAINT "emi_installments_payStatusId_fkey" FOREIGN KEY ("payStatusId") REFERENCES "loan_accounts"."emi_pay_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_accounts"."foreclosures" ADD CONSTRAINT "foreclosures_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "loan_accounts"."loan_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications"."loan_applications" ADD CONSTRAINT "loan_applications_applicationStatusId_fkey" FOREIGN KEY ("applicationStatusId") REFERENCES "loan_applications"."application_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications"."loan_applications" ADD CONSTRAINT "loan_applications_loanOfferId_fkey" FOREIGN KEY ("loanOfferId") REFERENCES "loan_applications"."loan_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications"."eligibility_snapshots" ADD CONSTRAINT "eligibility_snapshots_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"."loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications"."co_applicants" ADD CONSTRAINT "co_applicants_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"."loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications"."loan_offers" ADD CONSTRAINT "loan_offers_eligibilitySnapshotId_fkey" FOREIGN KEY ("eligibilitySnapshotId") REFERENCES "loan_applications"."eligibility_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_products"."loan_products" ADD CONSTRAINT "loan_products_loanProductTypeId_fkey" FOREIGN KEY ("loanProductTypeId") REFERENCES "loan_products"."loan_product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_template_versions" ADD CONSTRAINT "notification_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notifications"."notification_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."providers" ADD CONSTRAINT "providers_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "notifications"."notification_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."provider_failover_policies" ADD CONSTRAINT "provider_failover_policies_notificationChannelId_fkey" FOREIGN KEY ("notificationChannelId") REFERENCES "notifications"."notification_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."provider_health_checks" ADD CONSTRAINT "provider_health_checks_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "notifications"."providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notifications"."notification_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notifications" ADD CONSTRAINT "notifications_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "notifications"."notification_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notifications" ADD CONSTRAINT "notifications_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "notifications"."notification_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notifications" ADD CONSTRAINT "notifications_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "notifications"."broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_queue_entries" ADD CONSTRAINT "notification_queue_entries_notificationQueueId_fkey" FOREIGN KEY ("notificationQueueId") REFERENCES "notifications"."notification_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_queue_entries" ADD CONSTRAINT "notification_queue_entries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "notifications"."providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_retryOfDeliveryId_fkey" FOREIGN KEY ("retryOfDeliveryId") REFERENCES "notifications"."notification_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_retries" ADD CONSTRAINT "notification_retries_notificationDeliveryId_fkey" FOREIGN KEY ("notificationDeliveryId") REFERENCES "notifications"."notification_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."broadcasts" ADD CONSTRAINT "broadcasts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notifications"."notification_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_batches" ADD CONSTRAINT "notification_batches_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "notifications"."broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_batch_items" ADD CONSTRAINT "notification_batch_items_notificationBatchId_fkey" FOREIGN KEY ("notificationBatchId") REFERENCES "notifications"."notification_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."notification_batch_items" ADD CONSTRAINT "notification_batch_items_resultingNotificationId_fkey" FOREIGN KEY ("resultingNotificationId") REFERENCES "notifications"."notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."communication_log" ADD CONSTRAINT "communication_log_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."communication_log" ADD CONSTRAINT "communication_log_notificationDeliveryId_fkey" FOREIGN KEY ("notificationDeliveryId") REFERENCES "notifications"."notification_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."event_trigger_subscriptions" ADD CONSTRAINT "event_trigger_subscriptions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notifications"."notification_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."event_trigger_processed_events" ADD CONSTRAINT "event_trigger_processed_events_triggerSubscriptionId_fkey" FOREIGN KEY ("triggerSubscriptionId") REFERENCES "notifications"."event_trigger_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."regions" ADD CONSTRAINT "regions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."branches" ADD CONSTRAINT "branches_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "organization"."regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."departments" ADD CONSTRAINT "departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."teams" ADD CONSTRAINT "teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."teams" ADD CONSTRAINT "teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."user_assignment_history" ADD CONSTRAINT "user_assignment_history_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "organization"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."user_assignment_history" ADD CONSTRAINT "user_assignment_history_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."user_assignment_history" ADD CONSTRAINT "user_assignment_history_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "organization"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."holiday_calendars" ADD CONSTRAINT "holiday_calendars_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."holiday_calendars" ADD CONSTRAINT "holiday_calendars_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."holiday_calendar_entries" ADD CONSTRAINT "holiday_calendar_entries_holidayCalendarId_fkey" FOREIGN KEY ("holidayCalendarId") REFERENCES "organization"."holiday_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."working_hours_policies" ADD CONSTRAINT "working_hours_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."working_hours_policies" ADD CONSTRAINT "working_hours_policies_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."working_hours_slots" ADD CONSTRAINT "working_hours_slots_workingHoursPolicyId_fkey" FOREIGN KEY ("workingHoursPolicyId") REFERENCES "organization"."working_hours_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."escalation_rules" ADD CONSTRAINT "escalation_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."escalation_rules" ADD CONSTRAINT "escalation_rules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rbac"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac"."role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "rbac"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rbac"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."metric_definitions" ADD CONSTRAINT "metric_definitions_analyticsDatasetId_fkey" FOREIGN KEY ("analyticsDatasetId") REFERENCES "reports"."analytics_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."metric_definition_versions" ADD CONSTRAINT "metric_definition_versions_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "reports"."metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."kpis" ADD CONSTRAINT "kpis_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "reports"."metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."kpi_target_versions" ADD CONSTRAINT "kpi_target_versions_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "reports"."kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "reports"."metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_metricDefinitionVersionId_fkey" FOREIGN KEY ("metricDefinitionVersionId") REFERENCES "reports"."metric_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "reports"."dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "reports"."metric_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "reports"."kpis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."report_templates" ADD CONSTRAINT "report_templates_analyticsDatasetId_fkey" FOREIGN KEY ("analyticsDatasetId") REFERENCES "reports"."analytics_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."saved_reports" ADD CONSTRAINT "saved_reports_reportTemplateId_fkey" FOREIGN KEY ("reportTemplateId") REFERENCES "reports"."report_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."scheduled_reports" ADD CONSTRAINT "scheduled_reports_savedReportId_fkey" FOREIGN KEY ("savedReportId") REFERENCES "reports"."saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."report_executions" ADD CONSTRAINT "report_executions_reportTemplateId_fkey" FOREIGN KEY ("reportTemplateId") REFERENCES "reports"."report_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."report_executions" ADD CONSTRAINT "report_executions_savedReportId_fkey" FOREIGN KEY ("savedReportId") REFERENCES "reports"."saved_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."report_executions" ADD CONSTRAINT "report_executions_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "reports"."scheduled_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."export_jobs" ADD CONSTRAINT "export_jobs_reportExecutionId_fkey" FOREIGN KEY ("reportExecutionId") REFERENCES "reports"."report_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."export_jobs" ADD CONSTRAINT "export_jobs_analyticsDatasetId_fkey" FOREIGN KEY ("analyticsDatasetId") REFERENCES "reports"."analytics_datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports"."export_jobs" ADD CONSTRAINT "export_jobs_retryOfExportJobId_fkey" FOREIGN KEY ("retryOfExportJobId") REFERENCES "reports"."export_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."telephony_lines" ADD CONSTRAINT "telephony_lines_trunkId_fkey" FOREIGN KEY ("trunkId") REFERENCES "telephony"."trunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."telephony_lines" ADD CONSTRAINT "telephony_lines_simInventoryId_fkey" FOREIGN KEY ("simInventoryId") REFERENCES "telephony"."sim_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."caller_ids" ADD CONSTRAINT "caller_ids_trunkId_fkey" FOREIGN KEY ("trunkId") REFERENCES "telephony"."trunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."caller_ids" ADD CONSTRAINT "caller_ids_telephonyLineId_fkey" FOREIGN KEY ("telephonyLineId") REFERENCES "telephony"."telephony_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."caller_ids" ADD CONSTRAINT "caller_ids_dialerCampaignId_fkey" FOREIGN KEY ("dialerCampaignId") REFERENCES "telephony"."dialer_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_attempts" ADD CONSTRAINT "call_attempts_extensionId_fkey" FOREIGN KEY ("extensionId") REFERENCES "telephony"."extensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_attempts" ADD CONSTRAINT "call_attempts_trunkId_fkey" FOREIGN KEY ("trunkId") REFERENCES "telephony"."trunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_attempts" ADD CONSTRAINT "call_attempts_telephonyLineId_fkey" FOREIGN KEY ("telephonyLineId") REFERENCES "telephony"."telephony_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_attempts" ADD CONSTRAINT "call_attempts_ivrFlowVersionId_fkey" FOREIGN KEY ("ivrFlowVersionId") REFERENCES "telephony"."ivr_flow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_attempts" ADD CONSTRAINT "call_attempts_retryOfCallAttemptId_fkey" FOREIGN KEY ("retryOfCallAttemptId") REFERENCES "telephony"."call_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_recordings" ADD CONSTRAINT "call_recordings_callAttemptId_fkey" FOREIGN KEY ("callAttemptId") REFERENCES "telephony"."call_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_recording_access_log" ADD CONSTRAINT "call_recording_access_log_callRecordingId_fkey" FOREIGN KEY ("callRecordingId") REFERENCES "telephony"."call_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_monitoring_sessions" ADD CONSTRAINT "call_monitoring_sessions_callAttemptId_fkey" FOREIGN KEY ("callAttemptId") REFERENCES "telephony"."call_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_monitoring_transitions" ADD CONSTRAINT "call_monitoring_transitions_callMonitoringSessionId_fkey" FOREIGN KEY ("callMonitoringSessionId") REFERENCES "telephony"."call_monitoring_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_transfers" ADD CONSTRAINT "call_transfers_callAttemptId_fkey" FOREIGN KEY ("callAttemptId") REFERENCES "telephony"."call_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_transfers" ADD CONSTRAINT "call_transfers_fromExtensionId_fkey" FOREIGN KEY ("fromExtensionId") REFERENCES "telephony"."extensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_transfers" ADD CONSTRAINT "call_transfers_toExtensionId_fkey" FOREIGN KEY ("toExtensionId") REFERENCES "telephony"."extensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."call_conferences" ADD CONSTRAINT "call_conferences_callAttemptId_fkey" FOREIGN KEY ("callAttemptId") REFERENCES "telephony"."call_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."ivr_flow_versions" ADD CONSTRAINT "ivr_flow_versions_ivrId_fkey" FOREIGN KEY ("ivrId") REFERENCES "telephony"."ivrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."queue_memberships" ADD CONSTRAINT "queue_memberships_callQueueId_fkey" FOREIGN KEY ("callQueueId") REFERENCES "telephony"."call_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."agent_sessions" ADD CONSTRAINT "agent_sessions_extensionId_fkey" FOREIGN KEY ("extensionId") REFERENCES "telephony"."extensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."agent_status_histories" ADD CONSTRAINT "agent_status_histories_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "telephony"."agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."queue_participations" ADD CONSTRAINT "queue_participations_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "telephony"."agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."queue_participations" ADD CONSTRAINT "queue_participations_callQueueId_fkey" FOREIGN KEY ("callQueueId") REFERENCES "telephony"."call_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."dialer_campaign_trunks" ADD CONSTRAINT "dialer_campaign_trunks_dialerCampaignId_fkey" FOREIGN KEY ("dialerCampaignId") REFERENCES "telephony"."dialer_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."dialer_campaign_trunks" ADD CONSTRAINT "dialer_campaign_trunks_trunkId_fkey" FOREIGN KEY ("trunkId") REFERENCES "telephony"."trunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."dialer_queues" ADD CONSTRAINT "dialer_queues_dialerCampaignId_fkey" FOREIGN KEY ("dialerCampaignId") REFERENCES "telephony"."dialer_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."dialer_queue_entries" ADD CONSTRAINT "dialer_queue_entries_dialerQueueId_fkey" FOREIGN KEY ("dialerQueueId") REFERENCES "telephony"."dialer_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telephony"."dialer_retries" ADD CONSTRAINT "dialer_retries_dialerQueueEntryId_fkey" FOREIGN KEY ("dialerQueueEntryId") REFERENCES "telephony"."dialer_queue_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."login_attempts" ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."api_keys" ADD CONSTRAINT "api_keys_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
