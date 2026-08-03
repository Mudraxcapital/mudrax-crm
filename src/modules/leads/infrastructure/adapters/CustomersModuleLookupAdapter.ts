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
  resolveOrCreateCustomers,
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
    const [resolved] = await this.resolveOrCreateMany([input]);
    return resolved!;
  }

  async resolveOrCreateMany(
    inputs: ResolveOrCreateCustomerInput[],
  ): Promise<CustomerLookupSummary[]> {
    if (inputs.length === 0) return [];
    if (inputs.length === 1) {
      // Keep single-row path resilient to strong-identifier races.
      return [await this.resolveOrCreateOne(inputs[0]!)];
    }

    const actorUserId = inputs[0]!.actorUserId;
    const summaries = await resolveOrCreateCustomers({
      rows: inputs.map((input) => ({
        organizationId: input.organizationId,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        ownerManagerId: input.ownerManagerId,
      })),
      actor: { actorType: "USER", actorId: actorUserId },
    });

    return summaries.map((summary, index) => ({
      id: summary.id,
      organizationId: inputs[index]!.organizationId,
      fullName: summary.fullName,
    }));
  }

  private async resolveOrCreateOne(
    input: ResolveOrCreateCustomerInput,
  ): Promise<CustomerLookupSummary> {
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
