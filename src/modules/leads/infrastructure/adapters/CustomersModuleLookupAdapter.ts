// ============================================================================
// src/modules/leads/infrastructure/adapters/CustomersModuleLookupAdapter.ts
//
// Adapts `customers`' public API (index.ts) to this module's
// CustomerLookupPort — the only file in `leads` allowed to import from
// `customers` (ADR 0001: cross-module dependencies only through index.ts).
// ============================================================================

import {
  createCustomer,
  CustomerNotFoundError,
  DuplicateCustomerIdentifierError,
  getCustomer,
  listCustomers,
} from "@/modules/customers";
import type {
  CustomerLookupPort,
  CustomerLookupSummary,
  ResolveOrCreateCustomerInput,
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

  async resolveOrCreate(input: ResolveOrCreateCustomerInput): Promise<CustomerLookupSummary> {
    const searchKey = input.phone?.trim() || input.email?.trim() || input.fullName.trim();
    if (searchKey) {
      const matches = await listCustomers(input.organizationId, { search: searchKey, limit: 20 });
      const exact = matches.find(
        (customer) => customer.fullName.toLowerCase() === input.fullName.trim().toLowerCase(),
      );
      if (exact) {
        return {
          id: exact.id,
          organizationId: input.organizationId,
          fullName: exact.fullName,
        };
      }
      if (matches.length === 1 && matches[0]) {
        return {
          id: matches[0].id,
          organizationId: input.organizationId,
          fullName: matches[0].fullName,
        };
      }
    }

    const identifiers: Array<{ type: "PHONE" | "EMAIL"; value: string }> = [];
    if (input.phone?.trim()) identifiers.push({ type: "PHONE", value: input.phone.trim() });
    if (input.email?.trim()) identifiers.push({ type: "EMAIL", value: input.email.trim() });
    if (identifiers.length === 0) {
      // Customers require at least one identifier — synthesize a placeholder email for import-only rows.
      identifiers.push({
        type: "EMAIL",
        value: `import+${Date.now()}.${Math.random().toString(36).slice(2, 8)}@mudrax.local`,
      });
    }

    try {
      const created = await createCustomer({
        organizationId: input.organizationId,
        input: {
          fullName: input.fullName,
          identifiers,
        },
        actor: { actorType: "USER", actorId: input.actorUserId },
      });
      return {
        id: created.id,
        organizationId: created.organizationId,
        fullName: created.fullName,
      };
    } catch (error) {
      if (error instanceof DuplicateCustomerIdentifierError) {
        const existing = await this.findById(error.existingCustomerId);
        if (existing) return existing;
      }
      throw error;
    }
  }
}
