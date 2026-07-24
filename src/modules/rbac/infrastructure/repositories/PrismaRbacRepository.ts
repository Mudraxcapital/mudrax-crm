// ============================================================================
// src/modules/rbac/infrastructure/repositories/PrismaRbacRepository.ts
//
// Prisma-backed implementation of RbacRepository. The only repository
// implementation allowed to know about `@prisma/client` in this module.
// ============================================================================

import type { PrismaClient } from "@prisma/client";
import type { PermissionGrant, RbacRepository } from "../../domain/repositories/RbacRepository";
import type { AuthorizationRole } from "../../domain/entities/AuthorizationContext";

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
    if (roleIds.length === 0) {
      return [];
    }

    const grants = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });

    return grants.map((grant) => ({ code: grant.permission.code, scope: grant.dataScope }));
  }
}
