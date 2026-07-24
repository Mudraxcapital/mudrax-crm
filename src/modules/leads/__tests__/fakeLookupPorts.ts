// ============================================================================
// src/modules/leads/__tests__/fakeLookupPorts.ts
//
// In-memory CustomerLookupPort/UserLookupPort doubles for use-case unit
// tests, standing in for the real Customers/Users module adapters.
// ============================================================================

import type {
  CustomerLookupPort,
  CustomerLookupSummary,
} from "../application/ports/CustomerLookupPort";
import type { UserLookupPort, UserLookupSummary } from "../application/ports/UserLookupPort";

export class FakeCustomerLookupPort implements CustomerLookupPort {
  customers = new Map<string, CustomerLookupSummary>();

  async findById(customerId: string): Promise<CustomerLookupSummary | null> {
    return this.customers.get(customerId) ?? null;
  }
}

export class FakeUserLookupPort implements UserLookupPort {
  users = new Map<string, UserLookupSummary>();

  async findById(userId: string): Promise<UserLookupSummary | null> {
    return this.users.get(userId) ?? null;
  }
}
