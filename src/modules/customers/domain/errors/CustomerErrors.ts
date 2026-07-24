// ============================================================================
// src/modules/customers/domain/errors/CustomerErrors.ts
//
// Domain errors for the Customer aggregate's use-cases.
// ============================================================================

export class CustomerNotFoundError extends Error {
  constructor(id: string) {
    super(`Customer ${id} was not found.`);
    this.name = "CustomerNotFoundError";
  }
}

/**
 * Thrown when a new/updated PAN or Aadhaar identifier deterministically
 * matches an identifier already held by a *different* Customer — PAN/Aadhaar
 * must be unique across the entire Customer base (customers.md). Prevents
 * duplicate Customer creation, per the Customers business rule.
 */
export class DuplicateCustomerIdentifierError extends Error {
  constructor(
    public readonly identifierType: string,
    public readonly existingCustomerId: string,
  ) {
    super(
      `A Customer with this ${identifierType} already exists (Customer ${existingCustomerId}). ` +
        `PAN and Aadhaar must be unique across the Customer base.`,
    );
    this.name = "DuplicateCustomerIdentifierError";
  }
}

export class InvalidCustomerStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCustomerStateError";
  }
}
