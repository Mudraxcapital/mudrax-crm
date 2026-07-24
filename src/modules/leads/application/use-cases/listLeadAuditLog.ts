// ============================================================================
// src/modules/leads/application/use-cases/listLeadAuditLog.ts
//
// Read-only Audit Trail access for one Lead, and for the whole Organization
// (the latter backs Activity Timeline / CRM Dashboard "Recent Activities").
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadAuditRecord } from "../../domain/entities/LeadAuditRecord";

export function makeListLeadAuditLog(repository: LeadRepository) {
  return async function listLeadAuditLog(leadId: string): Promise<LeadAuditRecord[]> {
    return repository.listAuditLog(leadId);
  };
}

export function makeListRecentLeadActivity(repository: LeadRepository) {
  return async function listRecentLeadActivity(
    organizationId: string,
    limit = 20,
  ): Promise<LeadAuditRecord[]> {
    return repository.listRecentAuditLog(organizationId, limit);
  };
}
