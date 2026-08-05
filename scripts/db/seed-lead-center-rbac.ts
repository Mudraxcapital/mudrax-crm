/**
 * Idempotent RBAC-only reseed for Lead Center + Integrations permissions.
 * Usage: npx tsx scripts/db/seed-lead-center-rbac.ts
 */
import "dotenv/config";
import { createSeedClient } from "../../prisma/seed/lib/client";
import { seedOrganization } from "../../prisma/seed/steps/01-organization";
import { seedRbac } from "../../prisma/seed/steps/02-rbac";

async function main() {
  const prisma = createSeedClient();
  const org = await seedOrganization(prisma);
  const rbac = await seedRbac(prisma, org.organizationId);

  const codes = [
    "lead_center.view",
    "lead_center.import",
    "integration.view",
    "integration.manage",
  ];

  const perms = await prisma.permission.findMany({
    where: { code: { in: codes } },
    select: { code: true },
  });
  console.log(
    "permissions:",
    perms.map((p) => p.code).sort(),
  );

  const grants = await prisma.rolePermission.findMany({
    where: { permission: { code: { in: codes } } },
    include: {
      role: { select: { name: true } },
      permission: { select: { code: true } },
    },
  });

  const lines = grants
    .map((g) => `${g.role.name} -> ${g.permission.code} (${g.dataScope})`)
    .sort();
  console.log("grants:\n" + lines.join("\n"));
  console.log(`\nRoles seeded: ${Object.keys(rbac.roleIds).join(", ")}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
