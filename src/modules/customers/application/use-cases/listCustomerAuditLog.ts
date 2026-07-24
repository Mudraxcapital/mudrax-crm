// ============================================================================
// src/modules/customers/application/use-cases/listCustomerAuditLog.ts
//
// Read-only Audit Trail access for one Customer (platform-contracts.md §4).
// ============================================================================

import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import type { CustomerAuditRecord } from "../../domain/entities/CustomerAuditRecord";

export function makeListCustomerAuditLog(repository: CustomerRepository) {
  return async function listCustomerAuditLog(customerId: string): Promise<CustomerAuditRecord[]> {
    return repository.listAuditLog(customerId);
  };
}
