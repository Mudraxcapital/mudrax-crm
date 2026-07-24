import type { LoanProductRepository } from "../../domain/repositories/LoanProductRepository";
import { LoanProductNotFoundError } from "../../domain/errors/LoanProductErrors";
import {
  toLoanProductDto,
  toLoanProductTypeDto,
  type LoanProductDto,
  type LoanProductTypeDto,
} from "../dto/LoanProductDto";

export function makeGetLoanProduct(repository: LoanProductRepository) {
  return async function getLoanProduct(
    loanProductId: string,
    organizationId?: string,
  ): Promise<LoanProductDto | null> {
    const product = await repository.findById(loanProductId);
    if (!product) return null;
    if (organizationId && product.organizationId !== organizationId) return null;
    return toLoanProductDto(product);
  };
}

export function makeGetLoanProductOrThrow(repository: LoanProductRepository) {
  return async function getLoanProductOrThrow(
    loanProductId: string,
    organizationId: string,
  ): Promise<LoanProductDto> {
    const product = await repository.findById(loanProductId);
    if (!product || product.organizationId !== organizationId) {
      throw new LoanProductNotFoundError(loanProductId);
    }
    return toLoanProductDto(product);
  };
}

export function makeListLoanProducts(repository: LoanProductRepository) {
  return async function listLoanProducts(
    organizationId: string,
    filter?: { bankId?: string; status?: LoanProductDto["status"]; limit?: number; offset?: number },
  ): Promise<LoanProductDto[]> {
    const products = await repository.list(organizationId, filter);
    return products.map(toLoanProductDto);
  };
}

export function makeListLoanProductTypes(repository: LoanProductRepository) {
  return async function listLoanProductTypes(
    organizationId: string,
  ): Promise<LoanProductTypeDto[]> {
    const types = await repository.listProductTypes(organizationId);
    return types.map(toLoanProductTypeDto);
  };
}
