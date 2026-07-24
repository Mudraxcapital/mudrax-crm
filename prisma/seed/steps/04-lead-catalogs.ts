// ============================================================================
// prisma/seed/steps/04-lead-catalogs.ts
//
// Seeds requirement #1 (lookup/catalog tables) for the `leads` module:
// Lead Source, Lead Stage, Lost Reason, Call Feedback Status, Tag, and two
// example Custom Field Definitions — every one of these is explicitly
// documented in prisma/models/leads.prisma as an admin-configurable
// catalog/reference entity, never a hardcoded enum.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { CustomFieldType, StageBucket, CloseOutcome } from "@prisma/client";
import { explain, section, summary } from "../lib/logger";

export interface LeadCatalogSeedResult {
  leadSourceIds: Record<string, string>;
  leadStageIds: Record<string, string>;
  lostReasonIds: Record<string, string>;
  callFeedbackStatusIds: Record<string, string>;
  tagIds: Record<string, string>;
}

const LEAD_SOURCES = [
  "Website",
  "Facebook Ads",
  "Google Ads",
  "Referral",
  "Walk-in",
  "Cold Call",
  "WhatsApp Inquiry",
  "Bank Partner Referral",
];

const LEAD_STAGES: {
  name: string;
  bucket: StageBucket;
  closeOutcome?: CloseOutcome;
  sortOrder: number;
}[] = [
  { name: "Fresh", bucket: StageBucket.INITIAL, sortOrder: 1 },
  { name: "Contacted", bucket: StageBucket.ACTIVE, sortOrder: 2 },
  { name: "Interested", bucket: StageBucket.ACTIVE, sortOrder: 3 },
  { name: "Follow-up Scheduled", bucket: StageBucket.ACTIVE, sortOrder: 4 },
  { name: "Documentation In Progress", bucket: StageBucket.ACTIVE, sortOrder: 5 },
  { name: "Submitted to Bank", bucket: StageBucket.ACTIVE, sortOrder: 6 },
  { name: "Won", bucket: StageBucket.CLOSED, closeOutcome: CloseOutcome.WON, sortOrder: 7 },
  { name: "Lost", bucket: StageBucket.CLOSED, closeOutcome: CloseOutcome.LOST, sortOrder: 8 },
];

const LOST_REASONS = [
  "Not Interested",
  "Interest Rate Too High",
  "Chose Another Lender",
  "Not Eligible",
  "Unreachable / No Response",
  "Duplicate Lead",
];

const CALL_FEEDBACK_STATUSES: { name: string; isConnected: boolean }[] = [
  { name: "Connected - Interested", isConnected: true },
  { name: "Connected - Not Interested", isConnected: true },
  { name: "Connected - Call Back Later", isConnected: true },
  { name: "Not Connected - No Answer", isConnected: false },
  { name: "Not Connected - Switched Off", isConnected: false },
  { name: "Not Connected - Number Busy", isConnected: false },
  { name: "Not Connected - Invalid Number", isConnected: false },
];

const TAGS = [
  "Hot Lead",
  "VIP Customer",
  "High Ticket Size",
  "Repeat Customer",
  "Needs Documentation",
];

export async function seedLeadCatalogs(
  prisma: PrismaClient,
  organizationId: string,
): Promise<LeadCatalogSeedResult> {
  section("4. Leads module catalogs");

  explain(
    "Lead Source — structured, reportable acquisition-channel catalog; a Lead never stores a free-text source (leads.md).",
  );
  const leadSourceIds: Record<string, string> = {};
  for (const name of LEAD_SOURCES) {
    const row = await prisma.leadSource.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    leadSourceIds[name] = row.id;
  }

  explain(
    "Lead Stage — the admin-configurable pipeline; closeOutcome is set only for the two terminal CLOSED-bucket stages (CHECK constraint, migration 0007).",
  );
  const leadStageIds: Record<string, string> = {};
  for (const stage of LEAD_STAGES) {
    const row = await prisma.leadStage.upsert({
      where: { organizationId_name: { organizationId, name: stage.name } },
      update: {
        bucket: stage.bucket,
        closeOutcome: stage.closeOutcome,
        sortOrder: stage.sortOrder,
      },
      create: {
        organizationId,
        name: stage.name,
        bucket: stage.bucket,
        closeOutcome: stage.closeOutcome,
        sortOrder: stage.sortOrder,
      },
    });
    leadStageIds[stage.name] = row.id;
  }

  explain(
    "Lost Reason — required sub-classification whenever a Lead closes Lost (enforced by a BEFORE INSERT/UPDATE trigger, migration 0011).",
  );
  const lostReasonIds: Record<string, string> = {};
  for (const name of LOST_REASONS) {
    const row = await prisma.lostReason.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    lostReasonIds[name] = row.id;
  }

  explain(
    "Call Feedback Status — per-attempt outcome catalog, permanently distinct from Lead Stage (platform-contracts.md §8); isConnected backs the BRD's 'Connected when duration > 0s' default rule.",
  );
  const callFeedbackStatusIds: Record<string, string> = {};
  for (const status of CALL_FEEDBACK_STATUSES) {
    const row = await prisma.callFeedbackStatus.upsert({
      where: { organizationId_name: { organizationId, name: status.name } },
      update: { isConnected: status.isConnected },
      create: { organizationId, name: status.name, isConnected: status.isConnected },
    });
    callFeedbackStatusIds[status.name] = row.id;
  }

  explain("Tag — lightweight catalog deliberately scoped to Lead only (leads.md).");
  const tagIds: Record<string, string> = {};
  for (const name of TAGS) {
    const row = await prisma.tag.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    tagIds[name] = row.id;
  }

  explain(
    "Custom Field Definition — two example admin-defined Lead extension fields, each with a bounded data type (leads.md: 'no schema-less/free-form fields').",
  );
  await prisma.customFieldDefinition.upsert({
    where: { organizationId_name: { organizationId, name: "Preferred Contact Time" } },
    update: {},
    create: {
      organizationId,
      name: "Preferred Contact Time",
      dataType: CustomFieldType.SINGLE_SELECT,
      selectOptions: ["Morning", "Afternoon", "Evening"],
    },
  });
  await prisma.customFieldDefinition.upsert({
    where: { organizationId_name: { organizationId, name: "Existing Monthly EMI Obligations" } },
    update: {},
    create: {
      organizationId,
      name: "Existing Monthly EMI Obligations",
      dataType: CustomFieldType.NUMBER,
    },
  });

  summary("Lead Sources", LEAD_SOURCES.length);
  summary("Lead Stages", LEAD_STAGES.length);
  summary("Lost Reasons", LOST_REASONS.length);
  summary("Call Feedback Statuses", CALL_FEEDBACK_STATUSES.length);
  summary("Tags", TAGS.length);
  summary("Custom Field Definitions", 2);

  return { leadSourceIds, leadStageIds, lostReasonIds, callFeedbackStatusIds, tagIds };
}
