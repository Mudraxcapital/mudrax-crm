/**
 * One-shot: wipe campaigns, leads, customers, and all users except Admin.
 *
 * Keeps: organization, RBAC, lead catalogs (stages/sources/fields), Admin user.
 *
 * Usage: npx tsx scripts/db/wipe-test-data.ts
 */
import "dotenv/config";
import { createSeedClient } from "../../prisma/seed/lib/client";
import { ADMIN_EMAIL } from "../../prisma/seed/steps/03-admin-user";

async function main(): Promise<void> {
  const prisma = createSeedClient();

  console.log("Wiping campaign / lead / customer / user test data…\n");

  const before = {
    users: await prisma.user.count(),
    leads: await prisma.lead.count(),
    campaigns: await prisma.campaign.count(),
    customers: await prisma.customer.count(),
    importBatches: await prisma.importBatch.count(),
    followUps: await prisma.followUp.count(),
  };
  console.log("Before:", before);

  // 1) Downstream modules that reference leads / customers / users
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

  // 2) Campaigns + leads + customers
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

  // 3) Users (keep Admin)
  await prisma.$executeRaw`
    UPDATE users.users
    SET
      "assignedTeamLeadId" = NULL,
      "reportingManagerId" = NULL,
      "createdByUserId" = NULL,
      "updatedByUserId" = NULL
    WHERE lower(email) <> lower(${ADMIN_EMAIL})
  `;

  await prisma.$executeRaw`
    DELETE FROM organization.user_assignment_history
    WHERE "userId" IN (
      SELECT id FROM users.users WHERE lower(email) <> lower(${ADMIN_EMAIL})
    )
  `;

  await prisma.$executeRaw`
    DELETE FROM rbac.user_roles
    WHERE "userId" IN (
      SELECT id FROM users.users WHERE lower(email) <> lower(${ADMIN_EMAIL})
    )
  `;

  await prisma.$executeRaw`
    DELETE FROM users.login_attempts
    WHERE "userId" IN (
      SELECT id FROM users.users WHERE lower(email) <> lower(${ADMIN_EMAIL})
    )
    OR "userId" IS NULL
  `;

  await prisma.$executeRaw`
    DELETE FROM users.api_keys
    WHERE "ownerUserId" IN (
      SELECT id FROM users.users WHERE lower(email) <> lower(${ADMIN_EMAIL})
    )
  `;

  await prisma.$executeRaw`
    DELETE FROM users.user_audit_log
    WHERE "actorId" IN (
      SELECT id FROM users.users WHERE lower(email) <> lower(${ADMIN_EMAIL})
    )
    OR "targetId" IN (
      SELECT id FROM users.users WHERE lower(email) <> lower(${ADMIN_EMAIL})
    )
  `;

  await prisma.$executeRaw`
    DELETE FROM users.users
    WHERE lower(email) <> lower(${ADMIN_EMAIL})
  `;

  const after = {
    users: await prisma.user.count(),
    leads: await prisma.lead.count(),
    campaigns: await prisma.campaign.count(),
    customers: await prisma.customer.count(),
    importBatches: await prisma.importBatch.count(),
    followUps: await prisma.followUp.count(),
  };
  const remaining = await prisma.user.findMany({
    select: { email: true, fullName: true, employeeId: true },
  });

  console.log("\nAfter:", after);
  console.log("Remaining users:", remaining);
  console.log(`\nKept admin: ${ADMIN_EMAIL}`);
  console.log("Catalogs (stages/sources/fields) and RBAC were preserved.");

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("\nWipe failed:");
  console.error(error);
  process.exit(1);
});
