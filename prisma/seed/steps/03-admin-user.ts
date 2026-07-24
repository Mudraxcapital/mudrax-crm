// ============================================================================
// prisma/seed/steps/03-admin-user.ts
//
// Seeds requirement #4: one administrator user.
//
// This is the single bootstrap account needed to start configuring the
// system once Authentication is implemented and separately approved — see
// the DEV-ONLY credential warning in prisma/seed/README.md and in
// hashSeedPassword's own doc comment (lib/security.ts).
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { hashSeedPassword } from "../lib/security";
import { explain, section, summary } from "../lib/logger";
import type { OrganizationSeedResult } from "./01-organization";

export const ADMIN_EMAIL = "admin@mudraxcapital.com";
export const ADMIN_DEV_PASSWORD = "Mudrax@Admin2026!";

export interface AdminUserSeedResult {
  adminUserId: string;
}

export async function seedAdminUser(
  prisma: PrismaClient,
  org: OrganizationSeedResult,
  adminRoleId: string,
): Promise<AdminUserSeedResult> {
  section("3. Administrator User");

  explain(
    `One User (${ADMIN_EMAIL}), employeeCode EMP-0001, based at Mumbai Head Office / Operations.`,
  );
  explain(
    "passwordHash is a DEV-ONLY fixed credential (see prisma/seed/README.md), hashed with the same bcrypt strategy src/modules/auth verifies against — reset on every reseed so it never drifts from the documented password.",
  );

  const passwordHash = hashSeedPassword(ADMIN_DEV_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      currentBranchId: org.branchIds["MUM-HO"],
      currentDepartmentId: org.departmentIds["OPS"],
    },
    create: {
      organizationId: org.organizationId,
      employeeCode: "EMP-0001",
      fullName: "System Administrator",
      email: ADMIN_EMAIL,
      phone: "+919999900001",
      passwordHash,
      status: "ACTIVE",
      currentBranchId: org.branchIds["MUM-HO"],
      currentDepartmentId: org.departmentIds["OPS"],
    },
  });

  explain(
    "UserRole: grants the Admin Role to this User (rbac.user_roles — ADR 0002's Users -> UserRoles -> Roles relationship).",
  );
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRoleId } },
    update: {},
    create: { userId: admin.id, roleId: adminRoleId },
  });

  explain(
    "UserAssignmentHistory: the auditable record backing this User's current Branch/Department membership (organization.user_assignment_history).",
  );
  const hasOpenAssignment = await prisma.userAssignmentHistory.findFirst({
    where: { userId: admin.id, effectiveTo: null },
  });
  if (!hasOpenAssignment) {
    await prisma.userAssignmentHistory.create({
      data: {
        userId: admin.id,
        branchId: org.branchIds["MUM-HO"],
        departmentId: org.departmentIds["OPS"],
        reason: "Initial seed provisioning of the bootstrap Administrator account.",
      },
    });
  }

  summary("Administrator users", 1);
  return { adminUserId: admin.id };
}
