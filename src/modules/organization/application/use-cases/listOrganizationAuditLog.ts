// ============================================================================
// src/modules/organization/application/use-cases/listOrganizationAuditLog.ts
//
// Read-only Audit Trail access (platform-contracts.md §4: "even Admin/System
// gets read-only access to audit data through every interface — never write
// or delete"). Gated by the `audit.view` Permission at the presentation
// layer, same as every other module's audit read path.
// ============================================================================

import type { OrganizationRepository } from "../../domain/repositories/OrganizationRepository";
import type { OrganizationAuditRecord } from "../../domain/entities/OrganizationAuditRecord";

export function makeListOrganizationAuditLog(repository: OrganizationRepository) {
  return async function listOrganizationAuditLog(
    organizationId: string,
  ): Promise<OrganizationAuditRecord[]> {
    return repository.listAuditLog(organizationId);
  };
}
