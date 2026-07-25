// ============================================================================
// prisma/seed/steps/02-rbac.ts
//
// Seeds requirement #3: Roles, Permissions, Role Permissions.
// Data lives in ../lib/rbac-catalog.ts; this step only persists it.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import {
  PERMISSION_CATALOG,
  ROLE_DEFINITIONS,
  computeRoleGrants,
  type RoleName,
} from "../lib/rbac-catalog";
import { explain, section, summary } from "../lib/logger";

export interface RbacSeedResult {
  roleIds: Record<RoleName, string>;
  permissionIds: Record<string, string>;
}

export async function seedRbac(
  prisma: PrismaClient,
  organizationId: string,
): Promise<RbacSeedResult> {
  section("2. RBAC — Roles, Permissions, Role Permissions");

  explain(
    "Four fixed Roles (Caller, Team Lead, Manager, Admin). Custom roles are not supported.",
  );

  // Migrate legacy role name from earlier seeds.
  await prisma.role.updateMany({
    where: { organizationId, name: "Team Leader" },
    data: {
      name: "Team Lead",
      description:
        "Supervises Callers assigned to them. Data Scope: Team — records belonging to Callers under their supervision.",
    },
  });

  const roleIds = {} as Record<RoleName, string>;
  for (const roleDef of ROLE_DEFINITIONS) {
    const row = await prisma.role.upsert({
      where: { organizationId_name: { organizationId, name: roleDef.name } },
      update: { description: roleDef.description, isSystemRole: true },
      create: {
        organizationId,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      },
    });
    roleIds[roleDef.name] = row.id;
  }

  explain(
    `${PERMISSION_CATALOG.length} atomic Permissions spanning every bounded context, each tagged with its owning module (rbac.Permission.module).`,
  );
  const permissionIds: Record<string, string> = {};
  for (const permission of PERMISSION_CATALOG) {
    const row = await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description, module: permission.module },
      create: {
        code: permission.code,
        description: permission.description,
        module: permission.module,
      },
    });
    permissionIds[permission.code] = row.id;
  }

  explain(
    "Role -> Permission grants at Self/Team/Branch/Organization scope for the fixed Caller/Team Lead/Manager/Admin hierarchy. System scope only for Admin-only User Management and audit grants.",
  );
  const grants = computeRoleGrants();
  for (const grant of grants) {
    const roleId = roleIds[grant.role];
    const permissionId = permissionIds[grant.permissionCode];
    if (!roleId || !permissionId) {
      // Unreachable in practice: roleIds/permissionIds were just populated
      // from the same two catalogs computeRoleGrants() reads from.
      continue;
    }
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: { dataScope: grant.scope },
      create: { roleId, permissionId, dataScope: grant.scope },
    });
  }

  // Remove obsolete Organization / custom-role product permissions left by earlier seeds.
  const obsoleteCodes = [
    "organization.view",
    "organization.manage",
    "team.manage",
    "branch.manage",
    "department.manage",
    "escalation_rule.manage",
    "role.manage",
    "role_permission.manage",
  ];
  const obsolete = await prisma.permission.findMany({
    where: { code: { in: obsoleteCodes } },
    select: { id: true },
  });
  if (obsolete.length > 0) {
    const obsoleteIds = obsolete.map((row) => row.id);
    await prisma.rolePermission.deleteMany({ where: { permissionId: { in: obsoleteIds } } });
    await prisma.permission.deleteMany({ where: { id: { in: obsoleteIds } } });
  }

  summary("Roles", ROLE_DEFINITIONS.length);
  summary("Permissions", PERMISSION_CATALOG.length);
  summary("Role Permission grants", grants.length);

  return { roleIds, permissionIds };
}
