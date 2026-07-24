// ============================================================================
// src/modules/organization/application/use-cases/listBranchAuditLog.ts
//
// Read-only Audit Trail access for one Branch (platform-contracts.md §4 —
// "even Admin/System gets read-only access"). Gated by the `audit.view`
// Permission at the presentation layer.
// ============================================================================

import type { BranchRepository } from "../../domain/repositories/BranchRepository";
import type { OrganizationAuditRecord } from "../../domain/entities/OrganizationAuditRecord";

export function makeListBranchAuditLog(repository: BranchRepository) {
  return async function listBranchAuditLog(branchId: string): Promise<OrganizationAuditRecord[]> {
    return repository.listAuditLog(branchId);
  };
}
