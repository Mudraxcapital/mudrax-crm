// ============================================================================
// src/modules/organization/infrastructure/mappers/departmentMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated `Department` shape.
// ============================================================================

import type { Department as PrismaDepartment } from "@prisma/client";
import type { Department } from "../../domain/entities/Department";

export function toDepartment(row: PrismaDepartment): Department {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    code: row.code,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
