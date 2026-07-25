// ============================================================================
// src/modules/rbac/infrastructure/repositories/PrismaRbacRepository.ts
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import { getCompanyId } from "@/infra/company/getCompanyId";
import type { PermissionGrant, RbacRepository } from "../../domain/repositories/RbacRepository";
import type { AuthorizationRole } from "../../domain/entities/AuthorizationContext";
import { FIXED_ROLES, type FixedRoleName } from "../../domain/entities/FixedRoles";

export class PrismaRbacRepository implements RbacRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getEffectiveRolesForUser(userId: string): Promise<AuthorizationRole[]> {
    const now = new Date();
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      include: { role: true },
    });

    return userRoles.map((userRole) => ({ id: userRole.role.id, name: userRole.role.name }));
  }

  async getPermissionGrantsForRoles(roleIds: string[]): Promise<PermissionGrant[]> {
    if (roleIds.length === 0) return [];

    const grants = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });

    return grants.map((grant) => ({ code: grant.permission.code, scope: grant.dataScope }));
  }

  async listFixedRoles(): Promise<{ id: string; name: FixedRoleName }[]> {
    const companyId = await getCompanyId();
    const rows = await this.prisma.role.findMany({
      where: { organizationId: companyId, name: { in: [...FIXED_ROLES] }, isSystemRole: true },
      orderBy: { name: "asc" },
    });
    return rows
      .filter((row) => (FIXED_ROLES as readonly string[]).includes(row.name))
      .map((row) => ({ id: row.id, name: row.name as FixedRoleName }));
  }

  async getPrimaryRoleName(userId: string): Promise<string | null> {
    const roles = await this.getEffectiveRolesForUser(userId);
    const fixed = roles.find((role) => (FIXED_ROLES as readonly string[]).includes(role.name));
    return fixed?.name ?? roles[0]?.name ?? null;
  }

  async replaceUserFixedRole(
    userId: string,
    roleName: FixedRoleName,
    assignedByUserId: string | null,
  ): Promise<void> {
    const companyId = await getCompanyId();
    const role = await this.prisma.role.findUnique({
      where: { organizationId_name: { organizationId: companyId, name: roleName } },
    });
    if (!role) {
      throw new Error(`Fixed role not found: ${roleName}`);
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
          effectiveFrom: now,
          assignedByUserId,
        },
      });
    });
  }
}
