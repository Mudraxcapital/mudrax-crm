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
import { makeFindCustomerByContact } from "./application/use-cases/findCustomerByContact";
import { makeResolveOrCreateCustomers } from "./application/use-cases/resolveOrCreateCustomers";
import { makeListCustomerAuditLog } from "./application/use-cases/listCustomerAuditLog";
import {
  makeDetectDuplicates,
  makeDismissDuplicateCandidate,
  makeListDuplicateCandidates,
} from "./application/use-cases/detectDuplicates";
import { makeMergeCustomers } from "./application/use-cases/mergeCustomers";

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
export type {
  CustomerDuplicateCandidate,
  CustomerMerge,
  DuplicateMatchType,
  DuplicateCandidateStatus,
} from "./domain/entities/CustomerDuplicateCandidate";
export {
  DUPLICATE_MATCH_TYPES,
  DUPLICATE_CANDIDATE_STATUSES,
} from "./domain/entities/CustomerDuplicateCandidate";
export {
  CustomerNotFoundError,
  DuplicateCustomerIdentifierError,
  InvalidCustomerStateError,
  DuplicateCandidateNotFoundError,
  CustomerMergeError,
} from "./domain/errors/CustomerErrors";
export type {
  CustomerDto,
  CustomerIdentifierDto,
  CustomerSummaryDto,
} from "./application/dto/CustomerDto";
export type { DuplicateCandidateDto, CustomerMergeDto } from "./application/dto/DuplicateDto";
export type { ListCustomersOptions } from "./domain/repositories/CustomerRepository";
export {
  createCustomerSchema,
  updateCustomerSchema,
  identifierInputSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type IdentifierInput,
} from "./application/validators/customerSchemas";
export {
  mergeCustomersSchema,
  dismissDuplicateSchema,
  type MergeCustomersInput,
  type DismissDuplicateInput,
} from "./application/validators/duplicateSchemas";
export type { CreateCustomerCommand } from "./application/use-cases/createCustomer";
export type { UpdateCustomerCommand } from "./application/use-cases/updateCustomer";

const customerRepository = new PrismaCustomerRepository(prisma);

export const createCustomer = makeCreateCustomer(customerRepository);
export const updateCustomer = makeUpdateCustomer(customerRepository);
export const getCustomer = makeGetCustomer(customerRepository);
export const listCustomers = makeListCustomers(customerRepository);
export const countCustomers = makeCountCustomers(customerRepository);
export const findCustomerByContact = makeFindCustomerByContact(customerRepository);
export const resolveOrCreateCustomers = makeResolveOrCreateCustomers(customerRepository);
export const listCustomerAuditLog = makeListCustomerAuditLog(customerRepository);
export const detectDuplicates = makeDetectDuplicates(customerRepository);
export const listDuplicateCandidates = makeListDuplicateCandidates(customerRepository);
export const dismissDuplicateCandidate = makeDismissDuplicateCandidate(customerRepository);
export const mergeCustomers = makeMergeCustomers(customerRepository);
