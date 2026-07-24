import type { LoanProduct, LoanProductStatus, LoanProductType } from "../entities/LoanProduct";
import type { LoanProductsAuditActor, LoanProductsAuditRecord } from "../entities/LoanProductsAuditRecord";

export interface CreateLoanProductData {
  organizationId: string;
  bankId: string;
  loanProductTypeId: string;
  variant: string;
  name: string;
  status?: LoanProductStatus;
  minInterestRate: string;
  maxInterestRate: string;
  minTenureMonths: number;
  maxTenureMonths: number;
  minLoanAmount: string;
  maxLoanAmount: string;
  eligibilityRules?: Record<string, unknown> | null;
}

export interface UpdateLoanProductData {
  name?: string;
  status?: LoanProductStatus;
  minInterestRate?: string;
  maxInterestRate?: string;
  minTenureMonths?: number;
  maxTenureMonths?: number;
  minLoanAmount?: string;
  maxLoanAmount?: string;
  eligibilityRules?: Record<string, unknown> | null;
}

export interface ListLoanProductsFilter {
  bankId?: string;
  status?: LoanProductStatus;
  limit?: number;
  offset?: number;
}

export interface LoanProductRepository {
  findById(id: string): Promise<LoanProduct | null>;
  findByBankTypeVariant(
    bankId: string,
    loanProductTypeId: string,
    variant: string,
  ): Promise<LoanProduct | null>;
  list(organizationId: string, filter?: ListLoanProductsFilter): Promise<LoanProduct[]>;
  createWithAudit(
    data: CreateLoanProductData,
    actor: LoanProductsAuditActor,
    correlationId?: string | null,
  ): Promise<LoanProduct>;
  updateWithAudit(
    id: string,
    data: UpdateLoanProductData,
    actor: LoanProductsAuditActor,
    correlationId?: string | null,
  ): Promise<LoanProduct>;
  listProductTypes(organizationId: string): Promise<LoanProductType[]>;
  findProductTypeById(id: string): Promise<LoanProductType | null>;
  listAuditLog(targetId: string): Promise<LoanProductsAuditRecord[]>;
}
