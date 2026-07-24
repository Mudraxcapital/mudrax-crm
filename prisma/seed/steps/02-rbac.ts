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
    "Four canonical Roles from ADR 0002 (Caller, Team Leader, Manager, Admin), each flagged isSystemRole so the seed's own bootstrap Roles are distinguishable from future admin-created ones.",
  );
  const roleIds = {} as Record<RoleName, string>;
  for (const roleDef of ROLE_DEFINITIONS) {
    const row = await prisma.role.upsert({
      where: { organizationId_name: { organizationId, name: roleDef.name } },
      update: { description: roleDef.description },
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
    "Role -> Permission grants, each carrying a Data Scope per platform-contracts.md §2 — Self/Team/Branch/Organization following the natural Caller/Team Leader/Manager/Admin hierarchy, System only for the small, individually-named platform-level grants (RBAC administration, impersonation, provider configuration, audit read access).",
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

  summary("Roles", ROLE_DEFINITIONS.length);
  summary("Permissions", PERMISSION_CATALOG.length);
  summary("Role Permission grants", grants.length);

  return { roleIds, permissionIds };
}
