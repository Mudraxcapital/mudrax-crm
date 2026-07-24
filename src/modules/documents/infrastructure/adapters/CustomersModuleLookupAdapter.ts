// ============================================================================
// src/modules/documents/infrastructure/adapters/CustomersModuleLookupAdapter.ts
//
// Adapts `customers`' public API (index.ts) to this module's
// CustomerLookupPort — the only file in `documents` allowed to import from
// `customers` (ADR 0001).
// ============================================================================

import { getCustomer } from "@/modules/customers";
import type {
  CustomerLookupPort,
  CustomerLookupSummary,
} from "../../application/ports/CustomerLookupPort";

export class CustomersModuleLookupAdapter implements CustomerLookupPort {
  async findById(customerId: string): Promise<CustomerLookupSummary | null> {
    const customer = await getCustomer(customerId);
    if (!customer) return null;
    return { id: customer.id, organizationId: customer.organizationId };
  }
}
