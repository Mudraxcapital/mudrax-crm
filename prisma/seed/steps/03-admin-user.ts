// ============================================================================
// prisma/seed/steps/03-admin-user.ts
//
// Seeds the Mudrax Capitals employee roster for local development:
//   1 Admin, 1 Manager, 2 Team Leads (1 under Manager, 1 under Admin),
//   3 Callers per Team Lead, 4 Direct Admin (freelancer) Callers.
// Employee IDs use the MCS#### format (auto-assigned in production creates).
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { hashSeedPassword } from "../lib/security";
import { explain, section, summary } from "../lib/logger";
import type { OrganizationSeedResult } from "./01-organization";
import type { RoleName } from "../lib/rbac-catalog";

export const ADMIN_EMAIL = "aarush.taluja1@gmail.com";
export const ADMIN_DEV_PASSWORD = "Sairam@123";
export const DEMO_USER_PASSWORD = "Mudrax@User2026!";

export interface DemoUserSeed {
  role: RoleName;
  email: string;
  employeeId: string;
  fullName: string;
  phone: string;
  password: string;
  /** Index into TEAM_LEAD_DEFS for Callers under a Team Lead (0–1). */
  teamLeadIndex?: number;
  /** Admin-managed freelancer — no Team Lead assignment. */
  directAdmin?: boolean;
  /** Team Lead reports to Manager or Admin. */
  reportsTo?: "Manager" | "Admin";
}

const TEAM_LEAD_COUNT = 2;
/** Callers per Team Lead (3 under Manager TL + 3 under Admin TL). */
const CALLER_COUNTS_PER_TL = [3, 3] as const;
const DIRECT_ADMIN_CALLER_COUNT = 4;

const FIRST_NAMES = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Reyansh",
  "Ayaan",
  "Krishna",
  "Ishaan",
] as const;

const LAST_NAMES = [
  "Sharma",
  "Patel",
  "Reddy",
  "Nair",
  "Iyer",
  "Singh",
  "Gupta",
  "Mehta",
  "Joshi",
  "Kapoor",
] as const;

function employeeId(n: number): string {
  return `MCS${String(n).padStart(4, "0")}`;
}

function phoneFor(n: number): string {
  return `+9198${String(10000000 + n).slice(0, 8)}`;
}

const TEAM_LEAD_DEFS: Array<
  Omit<DemoUserSeed, "role" | "password"> & { reportsTo: "Manager" | "Admin" }
> = [
  {
    email: "ananya.sharma@mudraxcapital.com",
    employeeId: employeeId(3),
    fullName: "Ananya Sharma",
    phone: phoneFor(3),
    reportsTo: "Manager",
  },
  {
    email: "rohan.mehta@mudraxcapital.com",
    employeeId: employeeId(4),
    fullName: "Rohan Mehta",
    phone: phoneFor(4),
    reportsTo: "Admin",
  },
];

function buildCallerDefs(): DemoUserSeed[] {
  const defs: DemoUserSeed[] = [];
  let nameIndex = 0;
  let seq = 5;

  for (let teamLeadIndex = 0; teamLeadIndex < TEAM_LEAD_COUNT; teamLeadIndex++) {
    const count = CALLER_COUNTS_PER_TL[teamLeadIndex] ?? 0;
    for (let i = 0; i < count; i++) {
      const first = FIRST_NAMES[nameIndex]!;
      const last = LAST_NAMES[nameIndex]!;
      defs.push({
        role: "Caller",
        email: `${first.toLowerCase()}.${last.toLowerCase()}@mudraxcapital.com`,
        employeeId: employeeId(seq),
        fullName: `${first} ${last}`,
        phone: phoneFor(seq),
        password: DEMO_USER_PASSWORD,
        teamLeadIndex,
      });
      nameIndex += 1;
      seq += 1;
    }
  }

  const freelancerLabels = ["one", "two", "three", "four"] as const;
  for (let i = 0; i < DIRECT_ADMIN_CALLER_COUNT; i++) {
    const first = FIRST_NAMES[nameIndex]!;
    const last = LAST_NAMES[nameIndex]!;
    defs.push({
      role: "Caller",
      email: `direct.admin.${freelancerLabels[i]}@mudraxcapital.com`,
      employeeId: employeeId(seq),
      fullName: `${first} ${last}`,
      phone: phoneFor(seq),
      password: DEMO_USER_PASSWORD,
      directAdmin: true,
    });
    nameIndex += 1;
    seq += 1;
  }

  return defs;
}

export const DEMO_USERS: DemoUserSeed[] = [
  {
    role: "Admin",
    email: ADMIN_EMAIL,
    employeeId: employeeId(1),
    fullName: "Aarush Taluja",
    phone: phoneFor(1),
    password: ADMIN_DEV_PASSWORD,
  },
  {
    role: "Manager",
    email: "salaudin.malik@mudraxcapital.com",
    employeeId: employeeId(2),
    fullName: "Salaudin Malik",
    phone: phoneFor(2),
    password: DEMO_USER_PASSWORD,
  },
  ...TEAM_LEAD_DEFS.map((def) => ({
    ...def,
    role: "Team Lead" as const,
    password: DEMO_USER_PASSWORD,
  })),
  ...buildCallerDefs(),
];

export interface AdminUserSeedResult {
  adminUserId: string;
  userIds: Record<RoleName, string>;
  allUserIds: string[];
}

/**
 * Clears every employee row (and role assignments / assignment history) so
 * reseed always produces exactly the roster defined in DEMO_USERS.
 * Only `rbac.user_roles`, `users.login_attempts`, and `users.api_keys` hold
 * real FKs to `users.users`; other modules store user ids without FK.
 */
async function wipeExistingUsers(prisma: PrismaClient): Promise<void> {
  explain("Wiping existing users, roles, and assignment history…");

  await prisma.user.updateMany({
    data: {
      assignedTeamLeadId: null,
      reportingManagerId: null,
      createdByUserId: null,
      updatedByUserId: null,
    },
  });

  await prisma.userRole.deleteMany({});
  await prisma.userAssignmentHistory.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.loginAttempt.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.userAuditLog.deleteMany({});
  await prisma.user.deleteMany({});
}

export async function seedAdminUser(
  prisma: PrismaClient,
  org: OrganizationSeedResult,
  roleIds: Record<RoleName, string>,
): Promise<AdminUserSeedResult> {
  const teamCallers = CALLER_COUNTS_PER_TL.reduce((sum, n) => sum + n, 0);
  const directAdminCallers = DEMO_USERS.filter(
    (user) => user.role === "Caller" && user.directAdmin,
  ).length;
  const totalCallers = teamCallers + directAdminCallers;
  section(
    `3. Employees — 1 Admin, 1 Manager, ${TEAM_LEAD_COUNT} Team Leads, ${totalCallers} Callers`,
  );

  explain(
    "DEV-ONLY roster. Admin uses the provided credential; other roles share DEMO_USER_PASSWORD. Reseed replaces all users.",
  );
  explain(
    "Hierarchy: 1 TL → Manager, 1 TL → Admin; 3 Callers per TL; 4 Direct Admin freelancers.",
  );

  await wipeExistingUsers(prisma);

  const passwordByRole = new Map<RoleName, string>();
  const createdByEmail = new Map<string, string>();
  const teamLeadIds: string[] = [];
  let managerId: string | null = null;
  let adminUserId = "";

  const branchId = org.branchIds["MUM-HO"];
  const departmentId = org.departmentIds["OPS"];
  const teamId = org.teamIds["MUM-SALES"];

  // Create Manager + Admin first, then Team Leads, then Callers.
  const ordered = [
    ...DEMO_USERS.filter((u) => u.role === "Manager"),
    ...DEMO_USERS.filter((u) => u.role === "Admin"),
    ...DEMO_USERS.filter((u) => u.role === "Team Lead"),
    ...DEMO_USERS.filter((u) => u.role === "Caller"),
  ];

  for (const def of ordered) {
    const roleId = roleIds[def.role];
    if (!roleId) throw new Error(`Role ${def.role} was not seeded.`);

    const passwordHash = hashSeedPassword(def.password);
    passwordByRole.set(def.role, def.password);

    const assignedTeamLeadId: string | null =
      def.role === "Caller" && def.directAdmin
        ? null
        : def.role === "Caller" && def.teamLeadIndex !== undefined
          ? (teamLeadIds[def.teamLeadIndex] ?? null)
          : null;

    let reportingManagerId: string | null = null;
    if (def.role === "Team Lead") {
      if (def.reportsTo === "Admin") {
        reportingManagerId = adminUserId || null;
      } else {
        reportingManagerId = managerId;
      }
      if (!reportingManagerId) {
        throw new Error(`Team Lead ${def.email} is missing a reporting manager.`);
      }
    }

    const user: { id: string } = await prisma.user.create({
      data: {
        employeeId: def.employeeId,
        fullName: def.fullName,
        email: def.email.toLowerCase(),
        phone: def.phone,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        currentBranchId: branchId,
        currentDepartmentId: departmentId,
        currentTeamId: teamId,
        assignedTeamLeadId,
        reportingManagerId,
      },
      select: { id: true },
    });

    createdByEmail.set(def.email.toLowerCase(), user.id);
    if (def.role === "Manager") managerId = user.id;
    if (def.role === "Admin") adminUserId = user.id;
    if (def.role === "Team Lead") teamLeadIds.push(user.id);

    await prisma.userRole.create({ data: { userId: user.id, roleId } });
    await prisma.userAssignmentHistory.create({
      data: {
        userId: user.id,
        branchId,
        departmentId,
        teamId,
        reason: `Initial seed provisioning of ${def.role} account.`,
      },
    });

    const reportsNote =
      def.role === "Team Lead"
        ? ` → reports to ${def.reportsTo}`
        : def.role === "Caller" && def.directAdmin
          ? " → Direct Admin freelancer"
          : def.role === "Caller" && def.teamLeadIndex !== undefined
            ? ` → under TL#${def.teamLeadIndex + 1}`
            : "";
    explain(
      `${def.role.padEnd(10)} ${def.email} / ${def.password} (${def.employeeId})${reportsNote}`,
    );
  }

  const firstCaller = DEMO_USERS.find((u) => u.role === "Caller");
  if (!firstCaller || !managerId || !adminUserId || !teamLeadIds[0]) {
    throw new Error("Employee seed incomplete — missing Admin, Manager, Team Lead, or Caller.");
  }

  const userIds = {
    Admin: adminUserId,
    Manager: managerId,
    "Team Lead": teamLeadIds[0],
    Caller: createdByEmail.get(firstCaller.email.toLowerCase())!,
  } as Record<RoleName, string>;

  summary("Employees seeded", DEMO_USERS.length);
  explain(`Shared non-admin password: ${passwordByRole.get("Manager")}`);
  explain(
    `Hierarchy: Manager → 1 TL → 3 Callers | Admin → 1 TL → 3 Callers | Admin → ${directAdminCallers} freelancers`,
  );

  return {
    adminUserId,
    userIds,
    allUserIds: [...createdByEmail.values()],
  };
}
