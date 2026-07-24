import type { LoanProduct, LoanProductType } from "../../domain/entities/LoanProduct";

export interface LoanProductDto {
  id: string;
  organizationId: string;
  bankId: string;
  loanProductTypeId: string;
  variant: string;
  name: string;
  status: LoanProduct["status"];
  minInterestRate: string;
  maxInterestRate: string;
  minTenureMonths: number;
  maxTenureMonths: number;
  minLoanAmount: string;
  maxLoanAmount: string;
  eligibilityRules: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanProductTypeDto {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
}

export function toLoanProductDto(product: LoanProduct): LoanProductDto {
  return {
    id: product.id,
    organizationId: product.organizationId,
    bankId: product.bankId,
    loanProductTypeId: product.loanProductTypeId,
    variant: product.variant,
    name: product.name,
    status: product.status,
    minInterestRate: product.minInterestRate,
    maxInterestRate: product.maxInterestRate,
    minTenureMonths: product.minTenureMonths,
    maxTenureMonths: product.maxTenureMonths,
    minLoanAmount: product.minLoanAmount,
    maxLoanAmount: product.maxLoanAmount,
    eligibilityRules: product.eligibilityRules,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toLoanProductTypeDto(type: LoanProductType): LoanProductTypeDto {
  return {
    id: type.id,
    organizationId: type.organizationId,
    name: type.name,
    isActive: type.isActive,
  };
}
