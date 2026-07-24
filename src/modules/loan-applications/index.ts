import { prisma } from "@/infra/db/client";
import { PrismaLoanApplicationRepository } from "./infrastructure/repositories/PrismaLoanApplicationRepository";
import {
  CustomersModuleLookupAdapter,
  LeadsModuleLookupAdapter,
  LoanProductsModuleLookupAdapter,
  PrismaDashboardMetricsAdapter,
} from "./infrastructure/adapters/ModuleLookupAdapters";
import { makeCreateLoanApplication } from "./application/use-cases/createLoanApplication";
import { makeSubmitLoanApplication } from "./application/use-cases/submitLoanApplication";
import { makeDecideLoanApplication } from "./application/use-cases/decideLoanApplication";
import {
  makeCreateEligibilitySnapshot,
  makeCreateLoanOffer,
  makeDecideLoanOffer,
  makeListLoanOffers,
  makePresentLoanOffer,
} from "./application/use-cases/loanOffers";
import {
  makeGetLoanApplication,
  makeListApplicationStatuses,
  makeListLoanApplications,
  makeMarkApplicationConverted,
} from "./application/use-cases/getLoanApplication";
import { makeGetLoanDashboard } from "./application/use-cases/getLoanDashboard";

export type { LoanApplication, ApplicationStatus, ApplicationType, ApplicationStatusBucket } from "./domain/entities/LoanApplication";
export { APPLICATION_TYPES, APPLICATION_STATUS_BUCKETS } from "./domain/entities/LoanApplication";
export type { LoanOffer, LoanOfferStatus } from "./domain/entities/LoanOffer";
export { LOAN_OFFER_STATUSES } from "./domain/entities/LoanOffer";
export type { EligibilitySnapshot, EligibilityMethod, EligibilityDecision } from "./domain/entities/EligibilitySnapshot";
export { ELIGIBILITY_METHODS, ELIGIBILITY_DECISIONS } from "./domain/entities/EligibilitySnapshot";
export type { LoanApplicationsActorType, LoanApplicationsAuditActor, LoanApplicationsAuditRecord } from "./domain/entities/LoanApplicationsAuditRecord";
export { LOAN_APPLICATIONS_ACTOR_TYPES } from "./domain/entities/LoanApplicationsAuditRecord";

export {
  LoanApplicationNotFoundError,
  LoanOfferNotFoundError,
  EligibilitySnapshotNotFoundError,
  ApplicationStatusNotFoundError,
  InvalidApplicationTransitionError,
  InvalidOfferTransitionError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  InvalidLoanProductReferenceError,
  OfferExpiredError,
} from "./domain/errors/LoanApplicationErrors";

export type {
  LoanApplicationDto,
  LoanOfferDto,
  EligibilitySnapshotDto,
  ApplicationStatusDto,
  LoanDashboardDto,
} from "./application/dto/LoanApplicationDto";

export {
  createLoanApplicationSchema,
  updateLoanApplicationSchema,
  decideLoanApplicationSchema,
  createEligibilitySchema,
  createLoanOfferSchema,
  decideLoanOfferSchema,
  type CreateLoanApplicationInput,
  type UpdateLoanApplicationInput,
  type DecideLoanApplicationInput,
  type CreateEligibilityInput,
  type CreateLoanOfferInput,
  type DecideLoanOfferInput,
} from "./application/validators/loanApplicationSchemas";

const repository = new PrismaLoanApplicationRepository(prisma);
const customers = new CustomersModuleLookupAdapter();
const leads = new LeadsModuleLookupAdapter();
const products = new LoanProductsModuleLookupAdapter();
const metrics = new PrismaDashboardMetricsAdapter();

export const createLoanApplication = makeCreateLoanApplication(repository, customers, leads, products);
export const submitLoanApplication = makeSubmitLoanApplication(repository);
export const decideLoanApplication = makeDecideLoanApplication(repository);
export const createEligibilitySnapshot = makeCreateEligibilitySnapshot(repository, customers);
export const createLoanOffer = makeCreateLoanOffer(repository, products);
export const presentLoanOffer = makePresentLoanOffer(repository);
export const decideLoanOffer = makeDecideLoanOffer(repository, customers, leads, products);
export const listLoanOffers = makeListLoanOffers(repository);
export const getLoanApplication = makeGetLoanApplication(repository);
export const listLoanApplications = makeListLoanApplications(repository);
export const listApplicationStatuses = makeListApplicationStatuses(repository);
export const markApplicationConverted = makeMarkApplicationConverted(repository);
export const getLoanDashboard = makeGetLoanDashboard(repository, metrics);

export async function findLoanApplicationById(id: string) {
  return repository.findById(id);
}
