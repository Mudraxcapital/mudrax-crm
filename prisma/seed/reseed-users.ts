// ============================================================================
// One-shot: wipe + reseed organization substrate, RBAC, and employee roster.
// Usage: npx tsx prisma/seed/reseed-users.ts
// ============================================================================

import "dotenv/config";
import { createSeedClient } from "./lib/client";
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

async function main(): Promise<void> {
  const prisma = createSeedClient();

  console.log("Mudrax CRM — wipe + reseed employees\n");

  const org = await seedOrganization(prisma);
  const rbac = await seedRbac(prisma, org.organizationId);
  await seedAdminUser(prisma, org, rbac.roleIds);
  await seedLeadCatalogs(prisma, org.organizationId);

  section("Done");
  explain(`Admin: ${ADMIN_EMAIL} / ${ADMIN_DEV_PASSWORD}`);
  explain(`Other roles: ${DEMO_USER_PASSWORD}`);
  explain(`Roster size: ${DEMO_USERS.length} (1 admin, 1 manager, 3 team leads, 20 callers)`);
  explain("Lead Sources / Stages catalogs ensured.");

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("\nReseed failed:");
  console.error(error);
  process.exit(1);
});
