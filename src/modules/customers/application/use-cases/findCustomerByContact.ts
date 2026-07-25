// ============================================================================
// src/modules/customers/application/use-cases/findCustomerByContact.ts
//
// Resolve an existing Customer by phone/email normalized identifiers
// (used by Lead import resolve-or-create).
// ============================================================================

import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import { prepareIdentifier } from "../../domain/services/identifierMatching";
import { toCustomerSummaryDto, type CustomerSummaryDto } from "../dto/CustomerDto";

export function makeFindCustomerByContact(repository: CustomerRepository) {
  return async function findCustomerByContact(
    organizationId: string,
    input: { phone?: string | null; email?: string | null },
  ): Promise<CustomerSummaryDto | null> {
    if (input.phone?.trim()) {
      const prepared = prepareIdentifier("PHONE", input.phone);
      if (prepared.valueNormalized) {
        const hits = await repository.listByNormalizedIdentifier(
          organizationId,
          "PHONE",
          prepared.valueNormalized,
        );
        const active = hits.find((hit) => hit.customer.status !== "MERGED");
        if (active) return toCustomerSummaryDto(active.customer);
      }
    }

    if (input.email?.trim()) {
      const prepared = prepareIdentifier("EMAIL", input.email);
      if (prepared.valueNormalized) {
        const hits = await repository.listByNormalizedIdentifier(
          organizationId,
          "EMAIL",
          prepared.valueNormalized,
        );
        const active = hits.find((hit) => hit.customer.status !== "MERGED");
        if (active) return toCustomerSummaryDto(active.customer);
      }
    }

    return null;
  };
}
