// ============================================================================
// Full wipe + reseed: business data, employees, org substrate, RBAC, lead catalogs.
// Usage: npx tsx prisma/seed/reseed-users.ts
// ============================================================================

import "dotenv/config";
import { createSeedClient } from "./lib/client";
import { section, explain } from "./lib/logger";
import { wipeCrmBusinessData } from "./reset-crm-data";
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

async function main(): Promise<void> {
  const prisma = createSeedClient();

  console.log("Mudrax CRM — full wipe + reseed employees\n");

  section("1. Wiping all CRM business data");
  await wipeCrmBusinessData(prisma);

  const org = await seedOrganization(prisma);
  const rbac = await seedRbac(prisma, org.organizationId);
  await seedAdminUser(prisma, org, rbac.roleIds);
  await seedLeadCatalogs(prisma, org.organizationId);

  const callerCount = DEMO_USERS.filter((user) => user.role === "Caller").length;
  const teamLeadCount = DEMO_USERS.filter((user) => user.role === "Team Lead").length;
  const directAdminCount = DEMO_USERS.filter(
    (user) => user.role === "Caller" && user.directAdmin,
  ).length;

  section("Done");
  explain(`Admin:     ${ADMIN_EMAIL} / ${ADMIN_DEV_PASSWORD}`);
  explain(`Manager:   salaudin.malik@mudraxcapital.com / ${DEMO_USER_PASSWORD}`);
  explain(`Team Lead: (${teamLeadCount}) *@mudraxcapital.com / ${DEMO_USER_PASSWORD}`);
  explain(
    `Callers:   ${callerCount - directAdminCount} under Team Leads + ${directAdminCount} Direct Admin / ${DEMO_USER_PASSWORD}`,
  );
  explain(`Total employees: ${DEMO_USERS.length}`);
  explain("All leads, customers, campaigns, and related data were wiped.");

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("\nReseed failed:");
  console.error(error);
  process.exit(1);
});
