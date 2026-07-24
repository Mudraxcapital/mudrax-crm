// Public API of the `customers` module.
//
// Every export another module is allowed to depend on must be re-exported from here.
// No other module may import from this module's internal folders directly.

import { prisma } from "@/infra/db/client";
import { PrismaCustomerRepository } from "./infrastructure/repositories/PrismaCustomerRepository";
import { makeCreateCustomer } from "./application/use-cases/createCustomer";
import { makeUpdateCustomer } from "./application/use-cases/updateCustomer";
import {
  makeGetCustomer,
  makeListCustomers,
  makeCountCustomers,
} from "./application/use-cases/getCustomer";
import { makeListCustomerAuditLog } from "./application/use-cases/listCustomerAuditLog";

export type { Customer, CustomerStatus, IdentityConfidence } from "./domain/entities/Customer";
export { CUSTOMER_STATUSES, IDENTITY_CONFIDENCE_LEVELS } from "./domain/entities/Customer";
export type {
  CustomerIdentifier,
  IdentifierType,
  IdentifierStatus,
} from "./domain/entities/CustomerIdentifier";
export { IDENTIFIER_TYPES, IDENTIFIER_STATUSES } from "./domain/entities/CustomerIdentifier";
export type {
  CustomerActorType,
  CustomerAuditActor,
  CustomerAuditRecord,
} from "./domain/entities/CustomerAuditRecord";
export { CUSTOMER_ACTOR_TYPES } from "./domain/entities/CustomerAuditRecord";
export {
  CustomerNotFoundError,
  DuplicateCustomerIdentifierError,
  InvalidCustomerStateError,
} from "./domain/errors/CustomerErrors";
export type {
  CustomerDto,
  CustomerIdentifierDto,
  CustomerSummaryDto,
} from "./application/dto/CustomerDto";
export type { ListCustomersOptions } from "./domain/repositories/CustomerRepository";
export {
  createCustomerSchema,
  updateCustomerSchema,
  identifierInputSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type IdentifierInput,
} from "./application/validators/customerSchemas";
export type { CreateCustomerCommand } from "./application/use-cases/createCustomer";
export type { UpdateCustomerCommand } from "./application/use-cases/updateCustomer";

const customerRepository = new PrismaCustomerRepository(prisma);

export const createCustomer = makeCreateCustomer(customerRepository);
export const updateCustomer = makeUpdateCustomer(customerRepository);
export const getCustomer = makeGetCustomer(customerRepository);
export const listCustomers = makeListCustomers(customerRepository);
export const countCustomers = makeCountCustomers(customerRepository);
export const listCustomerAuditLog = makeListCustomerAuditLog(customerRepository);
