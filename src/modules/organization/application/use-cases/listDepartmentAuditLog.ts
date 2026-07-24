// ============================================================================
// src/modules/organization/application/use-cases/listDepartmentAuditLog.ts
//
// Read-only Audit Trail access for one Department (platform-contracts.md
// §4). Gated by the `audit.view` Permission at the presentation layer.
// ============================================================================

import type { DepartmentRepository } from "../../domain/repositories/DepartmentRepository";
import type { OrganizationAuditRecord } from "../../domain/entities/OrganizationAuditRecord";

export function makeListDepartmentAuditLog(repository: DepartmentRepository) {
  return async function listDepartmentAuditLog(
    departmentId: string,
  ): Promise<OrganizationAuditRecord[]> {
    return repository.listAuditLog(departmentId);
  };
}
