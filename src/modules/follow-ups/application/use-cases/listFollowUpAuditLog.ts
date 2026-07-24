// ============================================================================
// src/modules/follow-ups/application/use-cases/listFollowUpAuditLog.ts
//
// Read-only Audit Trail access for one Follow-up, and for the whole
// Organization (the latter backs Activity Timeline / CRM Dashboard "Recent
// Activities").
// ============================================================================

import type { FollowUpRepository } from "../../domain/repositories/FollowUpRepository";
import type { FollowUpAuditRecord } from "../../domain/entities/FollowUpAuditRecord";

export function makeListFollowUpAuditLog(repository: FollowUpRepository) {
  return async function listFollowUpAuditLog(followUpId: string): Promise<FollowUpAuditRecord[]> {
    return repository.listAuditLog(followUpId);
  };
}

export function makeListRecentFollowUpActivity(repository: FollowUpRepository) {
  return async function listRecentFollowUpActivity(
    organizationId: string,
    limit = 20,
  ): Promise<FollowUpAuditRecord[]> {
    return repository.listRecentAuditLog(organizationId, limit);
  };
}
