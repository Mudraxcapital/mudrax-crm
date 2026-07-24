// ============================================================================
// src/modules/customers/application/use-cases/getCustomer.ts
//
// Read-only lookups for the Customer aggregate.
// ============================================================================

import type {
  CustomerRepository,
  ListCustomersOptions,
} from "../../domain/repositories/CustomerRepository";
import { CustomerNotFoundError } from "../../domain/errors/CustomerErrors";
import {
  toCustomerDto,
  toCustomerSummaryDto,
  type CustomerDto,
  type CustomerSummaryDto,
} from "../dto/CustomerDto";

export function makeGetCustomer(repository: CustomerRepository) {
  return async function getCustomer(id: string): Promise<CustomerDto> {
    const found = await repository.findById(id);
    if (!found) {
      throw new CustomerNotFoundError(id);
    }
    return toCustomerDto(found);
  };
}

export function makeListCustomers(repository: CustomerRepository) {
  return async function listCustomers(
    organizationId: string,
    options?: ListCustomersOptions,
  ): Promise<CustomerSummaryDto[]> {
    const customers = await repository.list(organizationId, options);
    return customers.map(toCustomerSummaryDto);
  };
}

export function makeCountCustomers(repository: CustomerRepository) {
  return async function countCustomers(organizationId: string): Promise<number> {
    return repository.count(organizationId);
  };
}
