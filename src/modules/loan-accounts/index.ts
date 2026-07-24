import { prisma } from "@/infra/db/client";
import { PrismaLoanAccountRepository } from "./infrastructure/repositories/PrismaLoanAccountRepository";
import { makeOpenLoanAccount } from "./application/use-cases/openLoanAccount";
import {
  makeCloseLoanAccount,
  makeFindByOriginatingApplication,
  makeGetLoanAccount,
  makeListLoanAccounts,
} from "./application/use-cases/getLoanAccount";

export type { LoanAccount, LoanStatus } from "./domain/entities/LoanAccount";
export { formatAccountNumber } from "./domain/entities/LoanAccount";
export type {
  LoanAccountsActorType,
  LoanAccountsAuditActor,
  LoanAccountsAuditRecord,
} from "./domain/entities/LoanAccountsAuditRecord";
export { LOAN_ACCOUNTS_ACTOR_TYPES } from "./domain/entities/LoanAccountsAuditRecord";
export {
  LoanAccountNotFoundError,
  LoanAccountAlreadyExistsError,
  LoanStatusNotFoundError,
  InvalidLoanAccountTransitionError,
} from "./domain/errors/LoanAccountErrors";
export type { LoanAccountDto } from "./application/dto/LoanAccountDto";
export {
  openLoanAccountSchema,
  type OpenLoanAccountInput,
} from "./application/validators/loanAccountSchemas";

const repository = new PrismaLoanAccountRepository(prisma);

export const openLoanAccount = makeOpenLoanAccount(repository);
export const getLoanAccount = makeGetLoanAccount(repository);
export const listLoanAccounts = makeListLoanAccounts(repository);
export const closeLoanAccount = makeCloseLoanAccount(repository);
export const findLoanAccountByApplication = makeFindByOriginatingApplication(repository);

export async function findLoanAccountById(id: string) {
  return repository.findById(id);
}
