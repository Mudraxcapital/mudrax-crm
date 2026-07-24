// ============================================================================
// src/modules/organization/application/dto/BranchDto.ts
//
// What the Branch aggregate's use-cases return to the presentation layer —
// a plain, serializable shape (dates as ISO strings) safe to cross the
// server/client boundary and to JSON-encode in an API response.
// ============================================================================

import type { Branch } from "../../domain/entities/Branch";

export interface BranchDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address: string | null;
  timezone: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toBranchDto(branch: Branch): BranchDto {
  return {
    id: branch.id,
    organizationId: branch.organizationId,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    timezone: branch.timezone,
    isArchived: branch.isArchived,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}
