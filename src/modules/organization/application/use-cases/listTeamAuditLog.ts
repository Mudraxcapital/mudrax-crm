// ============================================================================
// src/modules/organization/application/use-cases/listTeamAuditLog.ts
//
// Read-only Audit Trail access for one Team (platform-contracts.md §4).
// Gated by the `audit.view` Permission at the presentation layer.
// ============================================================================

import type { TeamRepository } from "../../domain/repositories/TeamRepository";
import type { OrganizationAuditRecord } from "../../domain/entities/OrganizationAuditRecord";

export function makeListTeamAuditLog(repository: TeamRepository) {
  return async function listTeamAuditLog(teamId: string): Promise<OrganizationAuditRecord[]> {
    return repository.listAuditLog(teamId);
  };
}
