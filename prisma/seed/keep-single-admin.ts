// ============================================================================
// Wipe CRM business data, keep RBAC/org structure, leave only one Admin.
// Usage: npx tsx prisma/seed/keep-single-admin.ts
// ============================================================================

import "dotenv/config";
import { createSeedClient } from "./lib/client";
import { hashSeedPassword } from "./lib/security";
import { section, explain, summary } from "./lib/logger";
import { wipeCrmBusinessData } from "./reset-crm-data";
import { seedOrganization } from "./steps/01-organization";
import { seedRbac } from "./steps/02-rbac";
import { ADMIN_DEV_PASSWORD, ADMIN_EMAIL } from "./steps/03-admin-user";

const ADMIN_FULL_NAME = "Aarush Taluja";
const ADMIN_PHONE = "+919810000001";
const ADMIN_EMPLOYEE_ID = "MCS0001";

async function main(): Promise<void> {
  const prisma = createSeedClient();
  console.log("Mudrax CRM — keep single Admin only\n");

  section("Wiping business / transactional data");
  await wipeCrmBusinessData(prisma);

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
  const customers = await prisma.customer.count();
  const leads = await prisma.lead.count();

  section("Done");
  summary("Users remaining", remaining.length);
  summary("Customers remaining", customers);
  summary("Leads remaining", leads);
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
