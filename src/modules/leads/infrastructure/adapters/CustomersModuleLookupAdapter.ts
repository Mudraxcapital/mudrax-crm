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
  findCustomerByContact,
  getCustomer,
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
    const existing = await findCustomerByContact(input.organizationId, {
      phone: input.phone,
      email: input.email,
    });
    if (existing) {
      return {
        id: existing.id,
        organizationId: input.organizationId,
        fullName: existing.fullName,
      };
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
        ownerManagerId: input.ownerManagerId ?? null,
      });
      return {
        id: created.id,
        organizationId: created.organizationId,
        fullName: created.fullName,
      };
    } catch (error) {
      if (error instanceof DuplicateCustomerIdentifierError) {
        const byId = await this.findById(error.existingCustomerId);
        if (byId) return byId;
      }
      // Race: another import row created the same phone/email — re-resolve.
      const raced = await findCustomerByContact(input.organizationId, {
        phone: input.phone,
        email: input.email,
      });
      if (raced) {
        return {
          id: raced.id,
          organizationId: input.organizationId,
          fullName: raced.fullName,
        };
      }
      throw error;
    }
  }
}
