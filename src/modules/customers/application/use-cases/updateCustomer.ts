// ============================================================================
// src/modules/customers/application/use-cases/updateCustomer.ts
//
// Updates a Customer's lightweight identity/contact fields (customers.md:
// "Customer stays deliberately lightweight"). Identifier management (adding
// a new Phone/Email/PAN/Aadhaar) is a separate capability, not covered here.
// ============================================================================

import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import type { CustomerAuditActor } from "../../domain/entities/CustomerAuditRecord";
import { CustomerNotFoundError } from "../../domain/errors/CustomerErrors";
import type { UpdateCustomerInput } from "../validators/customerSchemas";
import { toCustomerDto, type CustomerDto } from "../dto/CustomerDto";

export interface UpdateCustomerCommand {
  id: string;
  input: UpdateCustomerInput;
  actor: CustomerAuditActor;
  correlationId?: string | null;
}

export function makeUpdateCustomer(repository: CustomerRepository) {
  return async function updateCustomer(command: UpdateCustomerCommand): Promise<CustomerDto> {
    const { id, input, actor, correlationId } = command;

    const existing = await repository.findById(id);
    if (!existing) {
      throw new CustomerNotFoundError(id);
    }

    const updated = await repository.updateWithAudit(
      id,
      {
        fullName: input.fullName,
        dob: input.dob ? new Date(`${input.dob}T00:00:00.000Z`) : undefined,
        status: input.status,
      },
      actor,
      correlationId,
    );

    return toCustomerDto(updated);
  };
}
