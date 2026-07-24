// ============================================================================
// src/modules/users/infrastructure/mappers/userMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated `User` shape.
// ============================================================================

import type { User as PrismaUser } from "@prisma/client";
import type {
  UserAuthProfile,
  UserScopeContext,
  UserSummary,
} from "../../domain/entities/UserAuthProfile";

export function toUserAuthProfile(row: PrismaUser): UserAuthProfile {
  return {
    id: row.id,
    organizationId: row.organizationId,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    email: row.email,
    passwordHash: row.passwordHash,
    status: row.status,
  };
}

export function toUserScopeContext(row: PrismaUser): UserScopeContext {
  return {
    userId: row.id,
    organizationId: row.organizationId,
    status: row.status,
    currentTeamId: row.currentTeamId,
    currentBranchId: row.currentBranchId,
    currentDepartmentId: row.currentDepartmentId,
  };
}

export function toUserSummary(row: PrismaUser): UserSummary {
  return {
    id: row.id,
    organizationId: row.organizationId,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    email: row.email,
    status: row.status,
    currentTeamId: row.currentTeamId,
    currentBranchId: row.currentBranchId,
  };
}
