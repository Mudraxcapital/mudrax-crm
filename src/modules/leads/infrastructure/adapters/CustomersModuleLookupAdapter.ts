// ============================================================================
// src/modules/leads/infrastructure/adapters/CustomersModuleLookupAdapter.ts
//
// Adapts `customers`' public API (index.ts) to this module's
// CustomerLookupPort — the only file in `leads` allowed to import from
// `customers` (ADR 0001: cross-module dependencies only through index.ts).
// ============================================================================

import { CustomerNotFoundError, getCustomer } from "@/modules/customers";
import type {
  CustomerLookupPort,
  CustomerLookupSummary,
} from "../../application/ports/CustomerLookupPort";

export class CustomersModuleLookupAdapter implements CustomerLookupPort {
  async findById(customerId: string): Promise<CustomerLookupSummary | null> {
    try {
      const customer = await getCustomer(customerId);
      return {
        id: customer.id,
        organizationId: customer.organizationId,
        fullName: customer.fullName,
      };
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        return null;
      }
      throw error;
    }
  }
}
