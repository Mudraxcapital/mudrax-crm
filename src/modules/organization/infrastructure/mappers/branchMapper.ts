// ============================================================================
// src/modules/organization/infrastructure/mappers/branchMapper.ts
//
// Prisma row -> domain type mapping. The only place in this module allowed
// to know about Prisma's generated `Branch` shape.
// ============================================================================

import type { Branch as PrismaBranch } from "@prisma/client";
import type { Branch } from "../../domain/entities/Branch";

export function toBranch(row: PrismaBranch): Branch {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    code: row.code,
    address: row.address,
    timezone: row.timezone,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
