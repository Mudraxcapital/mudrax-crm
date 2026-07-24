// ============================================================================
// src/modules/telephony/application/use-cases/listCallAttemptAuditLog.ts
//
// Read-only Audit Trail access for one Call Attempt, and for the whole
// Organization (the latter backs the Telephony Dashboard's Recent Calls /
// activity needs — mirrors leads' listLeadAuditLog.ts).
// ============================================================================

import type { CallAttemptRepository } from "../../domain/repositories/CallAttemptRepository";
import type { TelephonyAuditRecord } from "../../domain/entities/TelephonyAuditRecord";

export function makeListCallAttemptAuditLog(repository: CallAttemptRepository) {
  return async function listCallAttemptAuditLog(
    callAttemptId: string,
  ): Promise<TelephonyAuditRecord[]> {
    return repository.listAuditLog(callAttemptId);
  };
}

export function makeListRecentTelephonyActivity(repository: CallAttemptRepository) {
  return async function listRecentTelephonyActivity(
    organizationId: string,
    limit = 20,
  ): Promise<TelephonyAuditRecord[]> {
    return repository.listRecentAuditLog(organizationId, limit);
  };
}
