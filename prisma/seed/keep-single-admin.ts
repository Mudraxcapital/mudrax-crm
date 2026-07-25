// ============================================================================
// Wipe CRM business data, keep RBAC/org structure, leave only one Admin.
// Usage: npx tsx prisma/seed/keep-single-admin.ts
// ============================================================================

import "dotenv/config";
import { createSeedClient } from "./lib/client";
import { hashSeedPassword } from "./lib/security";
import { section, explain, summary } from "./lib/logger";
import { seedOrganization } from "./steps/01-organization";
import { seedRbac } from "./steps/02-rbac";
import { ADMIN_DEV_PASSWORD, ADMIN_EMAIL } from "./steps/03-admin-user";

const ADMIN_FULL_NAME = "Aarush Taluja";
const ADMIN_PHONE = "+919810000001";
const ADMIN_EMPLOYEE_ID = "MCS0001";

async function wipeBusinessData(
  prisma: ReturnType<typeof createSeedClient>,
): Promise<void> {
  section("Wiping business / transactional data");
  const statements = [
    `TRUNCATE TABLE disbursements.commissions, disbursements.disbursement_audit_log, disbursements.disbursements CASCADE`,
    `TRUNCATE TABLE loan_accounts.emi_installments, loan_accounts.emi_schedules, loan_accounts.foreclosures, loan_accounts.loan_account_audit_log, loan_accounts.loan_accounts CASCADE`,
    `TRUNCATE TABLE loan_applications.co_applicants, loan_applications.eligibility_snapshots, loan_applications.loan_offers, loan_applications.loan_application_audit_log, loan_applications.loan_applications CASCADE`,
    `TRUNCATE TABLE ai_crm.duplicate_detections, ai_crm.lead_recommendations, ai_crm.lead_scores, ai_crm.next_best_actions CASCADE`,
    `TRUNCATE TABLE telephony.call_events, telephony.call_recordings, telephony.call_attempts, telephony.agent_sessions CASCADE`,
    `TRUNCATE TABLE follow_ups.follow_ups, follow_ups.follow_up_audit_log CASCADE`,
    `TRUNCATE TABLE leads.lead_notes, leads.lead_tags, leads.lead_assignments, leads.lead_stage_history, leads.lead_custom_field_values, leads.import_rows, leads.import_batches, leads.leads, leads.lead_audit_log CASCADE`,
    `TRUNCATE TABLE campaigns.campaign_assignments, campaigns.campaign_leads, campaigns.campaigns, campaigns.campaign_audit_log CASCADE`,
    `TRUNCATE TABLE customers.customer_identifiers, customers.customer_addresses, customers.customers, customers.customer_audit_log CASCADE`,
    `TRUNCATE TABLE documents.document_versions, documents.attachments, documents.documents CASCADE`,
    `TRUNCATE TABLE users.user_sessions, users.login_attempts, users.api_keys, users.user_audit_log CASCADE`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  (skip: ${message.split("\n")[0]})`);
    }
  }
}

async function main(): Promise<void> {
  const prisma = createSeedClient();
  console.log("Mudrax CRM — keep single Admin only\n");

  await wipeBusinessData(prisma);

  section("Ensuring organization + RBAC structure");
  const org = await seedOrganization(prisma);
  const rbac = await seedRbac(prisma, org.organizationId);
  const adminRoleId = rbac.roleIds.Admin;
  if (!adminRoleId) {
    throw new Error("Admin role missing after RBAC seed.");
  }

  section("Removing every user except the single Admin");
  // Clear hierarchy FKs so deletes are not blocked by dangling pointers.
  await prisma.user.updateMany({
    data: { assignedTeamLeadId: null, reportingManagerId: null },
  });

  await prisma.userRole.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.loginAttempt.deleteMany({});
  await prisma.userAuditLog.deleteMany({});
  await prisma.userAssignmentHistory.deleteMany({});

  const passwordHash = hashSeedPassword(ADMIN_DEV_PASSWORD);
  const adminEmail = ADMIN_EMAIL.toLowerCase();

  // Remove every employee row — recreate the single Admin cleanly.
  await prisma.user.deleteMany({});

  const admin = await prisma.user.create({
    data: {
      employeeId: ADMIN_EMPLOYEE_ID,
      fullName: ADMIN_FULL_NAME,
      email: adminEmail,
      phone: ADMIN_PHONE,
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      lockedUntil: null,
      lockedReason: null,
      sessionVersion: 0,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: admin.id,
      roleId: adminRoleId,
    },
  });

  const remaining = await prisma.user.findMany({
    select: { email: true, employeeId: true, fullName: true, status: true },
    orderBy: { email: "asc" },
  });

  section("Done");
  summary("Users remaining", remaining.length);
  for (const user of remaining) {
    explain(`${user.employeeId}  ${user.fullName}  ${user.email}  (${user.status})`);
  }
  explain(`Login: ${ADMIN_EMAIL} / ${ADMIN_DEV_PASSWORD}`);

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("\nkeep-single-admin failed:");
  console.error(error);
  process.exit(1);
});
