import { prisma } from "@/infra/db/client";
import { PrismaLoanProductRepository } from "./infrastructure/repositories/PrismaLoanProductRepository";
import { BanksModuleLookupAdapter } from "./infrastructure/adapters/BanksModuleLookupAdapter";
import { makeCreateLoanProduct } from "./application/use-cases/createLoanProduct";
import { makeUpdateLoanProduct } from "./application/use-cases/updateLoanProduct";
import {
  makeGetLoanProduct,
  makeGetLoanProductOrThrow,
  makeListLoanProducts,
  makeListLoanProductTypes,
} from "./application/use-cases/getLoanProduct";

export type { LoanProduct, LoanProductStatus, LoanProductType } from "./domain/entities/LoanProduct";
export { LOAN_PRODUCT_STATUSES } from "./domain/entities/LoanProduct";
export type {
  LoanProductsActorType,
  LoanProductsAuditActor,
  LoanProductsAuditRecord,
} from "./domain/entities/LoanProductsAuditRecord";
export { LOAN_PRODUCTS_ACTOR_TYPES } from "./domain/entities/LoanProductsAuditRecord";

export {
  LoanProductNotFoundError,
  LoanProductTypeNotFoundError,
  DuplicateLoanProductError,
  InvalidLoanProductRangeError,
  InvalidBankReferenceError,
} from "./domain/errors/LoanProductErrors";

export type { LoanProductDto, LoanProductTypeDto } from "./application/dto/LoanProductDto";

export {
  createLoanProductSchema,
  updateLoanProductSchema,
  type CreateLoanProductInput,
  type UpdateLoanProductInput,
} from "./application/validators/loanProductSchemas";

const repository = new PrismaLoanProductRepository(prisma);
const bankLookup = new BanksModuleLookupAdapter();

export const createLoanProduct = makeCreateLoanProduct(repository, bankLookup);
export const updateLoanProduct = makeUpdateLoanProduct(repository);
export const getLoanProduct = makeGetLoanProduct(repository);
export const getLoanProductOrThrow = makeGetLoanProductOrThrow(repository);
export const listLoanProducts = makeListLoanProducts(repository);
export const listLoanProductTypes = makeListLoanProductTypes(repository);

export async function findLoanProductById(loanProductId: string) {
  return repository.findById(loanProductId);
}

export async function listLoanProductAuditLog(targetId: string) {
  return repository.listAuditLog(targetId);
}
