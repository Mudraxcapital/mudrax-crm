// ============================================================================
// prisma/seed/index.ts
//
// Orchestrates the whole development seed run, invoked via
// `npm run db:seed` (-> `prisma db seed`, wired in prisma.config.ts).
//
// Every step below is idempotent — it upserts on either a real unique
// constraint already declared in the accepted Prisma schema, or (for the
// handful of demo-only rows with no natural business key) a deterministic
// id from lib/determinism.ts. Re-running this script produces the exact
// same rows every time; it never accumulates duplicates.
//
// See prisma/seed/README.md for the full explanation of what is seeded and
// why, and for the DEV-ONLY credential warning for the bootstrap
// Administrator account created in step 3.
// ============================================================================

import { createSeedClient } from "./lib/client";
import { seedId } from "./lib/determinism";
import { section, explain } from "./lib/logger";
import { seedOrganization } from "./steps/01-organization";
import { seedRbac } from "./steps/02-rbac";
import {
  seedAdminUser,
  ADMIN_EMAIL,
  ADMIN_DEV_PASSWORD,
  DEMO_USER_PASSWORD,
  DEMO_USERS,
} from "./steps/03-admin-user";
import { seedLeadCatalogs } from "./steps/04-lead-catalogs";
import { seedLoanCatalogs } from "./steps/05-loan-catalogs";
import { seedBanks } from "./steps/06-banks";
import { seedLoanProducts } from "./steps/07-loan-products";
import { seedDocumentCatalogs } from "./steps/08-document-catalogs";
import { seedCustomers } from "./steps/09-customers";
import { seedLeads } from "./steps/10-leads";
import { seedFollowUps } from "./steps/11-follow-ups";
import { seedLoanApplications } from "./steps/12-loan-applications";
import { seedTelephonyCatalogs } from "./steps/13-telephony-catalogs";
import { seedNotificationCatalogs } from "./steps/14-notification-catalogs";
import { seedReportsCatalogs } from "./steps/15-reports-catalogs";

async function main(): Promise<void> {
  const prisma = createSeedClient();

  console.log("Mudrax CRM — development seed data");
  console.log("Re-runs safely: every step upserts, nothing is ever duplicated.\n");

  const org = await seedOrganization(prisma);
  const rbac = await seedRbac(prisma, org.organizationId);
  for (const roleName of ["Admin", "Manager", "Team Lead", "Caller"] as const) {
    if (!rbac.roleIds[roleName]) {
      throw new Error(`Role ${roleName} was not seeded — check lib/rbac-catalog.ts ROLE_DEFINITIONS.`);
    }
  }
  const admin = await seedAdminUser(prisma, org, rbac.roleIds);

  const leadCatalogs = await seedLeadCatalogs(prisma, org.organizationId);
  const loanCatalogs = await seedLoanCatalogs(prisma, org.organizationId);
  const banks = await seedBanks(prisma, org.organizationId, admin.adminUserId);
  const loanProductIds = await seedLoanProducts(
    prisma,
    org.organizationId,
    banks.bankIds,
    loanCatalogs.loanProductTypeIds,
  );
  await seedDocumentCatalogs(prisma, org.organizationId);

  // Demo Customers / Leads / Follow-ups / Loan Applications are only for empty
  // local DBs. If real imported leads already exist, skip so seed re-runs do
  // not inflate CRM totals (e.g. 1003 imported + 8 demo = 1011).
  const demoLeadKeys = [
    "rahul-sharma",
    "priya-patel",
    "amit-verma",
    "sneha-reddy",
    "vikram-singh",
    "anjali-nair",
    "rajesh-kumar",
    "neha-gupta",
  ] as const;
  const demoLeadIds = demoLeadKeys.map((key) => seedId(`lead:${key}`));
  const [totalLeads, demoLeadsPresent] = await Promise.all([
    prisma.lead.count({ where: { organizationId: org.organizationId } }),
    prisma.lead.count({
      where: { organizationId: org.organizationId, id: { in: demoLeadIds } },
    }),
  ]);
  const hasRealLeads = totalLeads - demoLeadsPresent > 0;

  if (hasRealLeads) {
    section("9–12. Demo pipeline skipped");
    explain(
      `Skipping demo Customers/Leads/Follow-ups/Loan Applications — ${totalLeads - demoLeadsPresent} real lead(s) already present.`,
    );
  } else {
    const customers = await seedCustomers(prisma, org.organizationId);
    const leads = await seedLeads(
      prisma,
      org.organizationId,
      customers,
      leadCatalogs,
      admin.adminUserId,
    );
    await seedFollowUps(prisma, org.organizationId, leads, admin.adminUserId);
    await seedLoanApplications(
      prisma,
      org.organizationId,
      customers,
      leads,
      loanProductIds,
      loanCatalogs,
      admin.adminUserId,
    );
  }
  await seedTelephonyCatalogs(prisma, org.organizationId);
  await seedNotificationCatalogs(prisma, org.organizationId);
  await seedReportsCatalogs(prisma, org.organizationId, admin.adminUserId);

  section("Done");
  explain(`DEV-ONLY logins (see README.md):`);
  explain(`  Admin      ${ADMIN_EMAIL} / ${ADMIN_DEV_PASSWORD}`);
  explain(`  Manager    salaudin.malik@mudraxcapital.com / ${DEMO_USER_PASSWORD}`);
  explain(`  Team Lead  (${DEMO_USERS.filter((u) => u.role === "Team Lead").length})  *@mudraxcapital.com / ${DEMO_USER_PASSWORD}`);
  explain(`  Caller     (${DEMO_USERS.filter((u) => u.role === "Caller").length}) *@mudraxcapital.com / ${DEMO_USER_PASSWORD}`);
  explain(`Total employees seeded: ${DEMO_USERS.length}`);

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("\nSeed failed:");
  console.error(error);
  process.exit(1);
});
