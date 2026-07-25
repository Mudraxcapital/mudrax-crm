// ============================================================================
// src/modules/customers/application/use-cases/createCustomer.ts
//
// Creates a Customer identity anchored on the weighted identifier set
// supplied (customers.md). Deterministic PAN/Aadhaar matches against a
// *different* existing Customer in the same Organization are rejected
// outright (Customers business rule: "Prevent duplicate customer creation").
// ============================================================================

import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import type { CustomerAuditActor } from "../../domain/entities/CustomerAuditRecord";
import { DuplicateCustomerIdentifierError } from "../../domain/errors/CustomerErrors";
import { prepareIdentifier } from "../../domain/services/identifierMatching";
import type { CreateCustomerInput } from "../validators/customerSchemas";
import { toCustomerDto, type CustomerDto } from "../dto/CustomerDto";

export interface CreateCustomerCommand {
  organizationId: string;
  input: CreateCustomerInput;
  actor: CustomerAuditActor;
  ownerManagerId?: string | null;
  correlationId?: string | null;
}

export function makeCreateCustomer(repository: CustomerRepository) {
  return async function createCustomer(command: CreateCustomerCommand): Promise<CustomerDto> {
    const { organizationId, input, actor, ownerManagerId, correlationId } = command;

    const prepared = input.identifiers.map((identifier) =>
      prepareIdentifier(identifier.type, identifier.value),
    );

    for (const identifier of prepared) {
      if (!identifier.valueHash) continue;
      const existing = await repository.findByIdentifierHash(
        organizationId,
        identifier.type,
        identifier.valueHash,
      );
      if (existing) {
        throw new DuplicateCustomerIdentifierError(identifier.type, existing.id);
      }
    }

    const created = await repository.createWithAudit(
      {
        organizationId,
        fullName: input.fullName,
        dob: input.dob ? new Date(`${input.dob}T00:00:00.000Z`) : null,
        ownerManagerId: ownerManagerId ?? null,
        identifiers: prepared.map((identifier) => ({
          type: identifier.type,
          valueHash: identifier.valueHash,
          valueNormalized: identifier.valueNormalized,
          valueMasked: identifier.valueMasked,
        })),
      },
      actor,
      correlationId,
    );

    return toCustomerDto(created);
  };
}
