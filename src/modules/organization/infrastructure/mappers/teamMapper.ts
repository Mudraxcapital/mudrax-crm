// ============================================================================
// src/modules/organization/infrastructure/mappers/teamMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated `Team` shape.
// ============================================================================

import type { Team as PrismaTeam } from "@prisma/client";
import type { Team } from "../../domain/entities/Team";

export function toTeam(row: PrismaTeam): Team {
  return {
    id: row.id,
    organizationId: row.organizationId,
    branchId: row.branchId,
    name: row.name,
    code: row.code,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
