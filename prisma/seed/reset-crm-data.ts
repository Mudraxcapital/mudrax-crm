// ============================================================================
// prisma/seed/reset-crm-data.ts
//
// Safe CRM business-data wipe that PRESERVES system users, roles, permissions,
// authentication, organization settings, and catalogs (stages/sources/fields).
//
// Deletes: customers, leads, campaigns, assignments, import history, notes,
// follow-ups, telephony call data, loan applications/accounts, documents,
// AI CRM analytics, and (best-effort) notification/report run data.
//
// Usage:
//   npx tsx prisma/seed/reset-crm-data.ts
//   npm run db:reset-crm
// ============================================================================

import "dotenv/config";
import { createSeedClient } from "./lib/client";
import { section, explain } from "./lib/logger";

async function truncateBestEffort(
  prisma: ReturnType<typeof createSeedClient>,
  label: string,
  sql: string,
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  (skip ${label}: ${message.split("\n")[0]})`);
  }
}

/** Wipes transactional CRM data; preserves users, RBAC, org, and catalogs. */
export async function wipeCrmBusinessData(
  prisma: ReturnType<typeof createSeedClient>,
): Promise<void> {

  // Core wipe path aligned with scripts/wipe-test-data.ts (proven against this schema).
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      disbursements.commissions,
      disbursements.disbursement_audit_log,
      disbursements.disbursements
    CASCADE;

    TRUNCATE TABLE
      loan_accounts.emi_installments,
      loan_accounts.emi_schedules,
      loan_accounts.foreclosures,
      loan_accounts.loan_account_audit_log,
      loan_accounts.loan_accounts
    CASCADE;

    TRUNCATE TABLE
      loan_applications.co_applicants,
      loan_applications.eligibility_snapshots,
      loan_applications.loan_offers,
      loan_applications.loan_application_audit_log,
      loan_applications.loan_applications
    CASCADE;

    TRUNCATE TABLE
      ai_crm.duplicate_detections,
      ai_crm.lead_recommendations,
      ai_crm.lead_scores,
      ai_crm.next_best_actions
    CASCADE;

    TRUNCATE TABLE
      telephony.call_recording_access_log,
      telephony.call_recordings,
      telephony.call_notes,
      telephony.call_outcomes,
      telephony.call_transfers,
      telephony.call_conferences,
      telephony.call_monitoring_transitions,
      telephony.call_monitoring_sessions,
      telephony.call_attempts,
      telephony.agent_status_histories,
      telephony.agent_sessions,
      telephony.queue_participations,
      telephony.queue_memberships,
      telephony.dialer_retries,
      telephony.dialer_queue_entries,
      telephony.dialer_campaign_trunks,
      telephony.dialer_campaigns,
      telephony.extensions
    CASCADE;

    TRUNCATE TABLE
      documents.share_access_log_entries,
      documents.document_sharings,
      documents.extracted_fields,
      documents.ocr_jobs,
      documents.document_verifications,
      documents.attachments,
      documents.document_versions,
      documents.bundle_members,
      documents.document_bundles,
      documents.checklist_items,
      documents.document_checklists,
      documents.upload_sessions,
      documents.legal_holds,
      documents.documents
    CASCADE;

    TRUNCATE TABLE
      follow_ups.follow_up_reassignments,
      follow_ups.follow_up_audit_log,
      follow_ups.follow_ups
    CASCADE;
  `);

  await truncateBestEffort(
    prisma,
    "ai_analytics",
    `
    TRUNCATE TABLE
      ai_analytics.anomaly_detections,
      ai_analytics.trend_analyses,
      ai_analytics.predictions,
      ai_analytics.forecasts
    CASCADE;
    `,
  );

  await truncateBestEffort(
    prisma,
    "notifications",
    `
    TRUNCATE TABLE
      notifications.notification_batch_items,
      notifications.notification_batches,
      notifications.notification_retries,
      notifications.notification_deliveries,
      notifications.notification_queue_entries,
      notifications.notification_queues,
      notifications.notifications,
      notifications.communication_log,
      notifications.broadcasts
    CASCADE;
    `,
  );

  await truncateBestEffort(
    prisma,
    "reports",
    `
    TRUNCATE TABLE
      reports.export_jobs,
      reports.report_executions,
      reports.analytics_snapshots,
      reports.report_audit_log
    CASCADE;
    `,
  );

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      campaigns.campaign_audit_log,
      campaigns.campaign_assignment_allocations,
      campaigns.campaign_assignments,
      campaigns.campaign_memberships,
      campaigns.campaigns
    CASCADE;

    TRUNCATE TABLE
      leads.duplicate_match_existing_leads,
      leads.duplicate_matches,
      leads.lead_custom_field_values,
      leads.lead_tags,
      leads.lead_notes,
      leads.lead_call_feedback,
      leads.lead_assignments,
      leads.lead_audit_log,
      leads.import_rows,
      leads.import_batches,
      leads.saved_views,
      leads.leads
    CASCADE;

    TRUNCATE TABLE
      customers.customer_audit_log,
      customers.customer_merges,
      customers.customer_duplicate_candidates,
      customers.customer_identifiers,
      customers.customers
    CASCADE;
  `);
}

async function main(): Promise<void> {
  const prisma = createSeedClient();

  console.log("Mudrax CRM — reset business data (preserve users & RBAC)\n");

  const before = {
    users: await prisma.user.count(),
    roles: await prisma.role.count(),
    leads: await prisma.lead.count(),
    campaigns: await prisma.campaign.count(),
    customers: await prisma.customer.count(),
    importBatches: await prisma.importBatch.count(),
    followUps: await prisma.followUp.count(),
  };
  console.log("Before:", before);

  section("Wiping downstream / transactional business data");
  await wipeCrmBusinessData(prisma);

  section("Wiping campaigns, leads, customers, import history");

  const after = {
    users: await prisma.user.count(),
    roles: await prisma.role.count(),
    leads: await prisma.lead.count(),
    campaigns: await prisma.campaign.count(),
    customers: await prisma.customer.count(),
    importBatches: await prisma.importBatch.count(),
    followUps: await prisma.followUp.count(),
  };

  section("Done");
  console.log("After:", after);
  explain(
    "Preserved: Users (Admin/Manager/Team Lead/Caller), Roles, Permissions, Auth, Organization, Settings, Lead catalogs, Field definitions.",
  );
  explain(
    "Deleted: Customers, Leads, Campaigns, Memberships, Assignments, Imports, Notes, Follow-ups, Calls, Loans, Documents, Analytics runs.",
  );

  if (after.users !== before.users) {
    throw new Error(
      `User count changed (${before.users} → ${after.users}) — aborting integrity check.`,
    );
  }

  await prisma.$disconnect();
}

const isDirectRun =
  (process.argv[1]?.replace(/\\/g, "/") ?? "").endsWith("reset-crm-data.ts");

if (isDirectRun) {
  main().catch(async (error: unknown) => {
    console.error("\nCRM reset failed:");
    console.error(error);
    process.exit(1);
  });
}
