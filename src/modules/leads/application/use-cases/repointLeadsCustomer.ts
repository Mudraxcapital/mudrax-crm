// ============================================================================
// src/modules/leads/application/use-cases/repointLeadsCustomer.ts
//
// After Customer Merge, move Lead ownership to the surviving Customer so
// list-by-customer queries remain correct (customers.md redirect semantics).
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";

export function makeRepointLeadsCustomer(repository: LeadRepository) {
  return async function repointLeadsCustomer(
    fromCustomerId: string,
    toCustomerId: string,
  ): Promise<number> {
    if (fromCustomerId === toCustomerId) return 0;
    return repository.repointCustomer(fromCustomerId, toCustomerId);
  };
}
