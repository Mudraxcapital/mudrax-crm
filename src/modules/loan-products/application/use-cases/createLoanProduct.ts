import type { LoanProductRepository } from "../../domain/repositories/LoanProductRepository";
import type { LoanProductsAuditActor } from "../../domain/entities/LoanProductsAuditRecord";
import type { BankLookupPort } from "../ports/BankLookupPort";
import {
  DuplicateLoanProductError,
  InvalidBankReferenceError,
  LoanProductTypeNotFoundError,
} from "../../domain/errors/LoanProductErrors";
import type { CreateLoanProductInput } from "../validators/loanProductSchemas";
import { toLoanProductDto, type LoanProductDto } from "../dto/LoanProductDto";

export interface CreateLoanProductCommand {
  organizationId: string;
  input: CreateLoanProductInput;
  actor: LoanProductsAuditActor;
  correlationId?: string | null;
}

function parseRules(json?: string): Record<string, unknown> | null {
  if (!json || !json.trim()) return null;
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Eligibility rules must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function makeCreateLoanProduct(
  repository: LoanProductRepository,
  bankLookup: BankLookupPort,
) {
  return async function createLoanProduct(
    command: CreateLoanProductCommand,
  ): Promise<LoanProductDto> {
    const { organizationId, input, actor, correlationId } = command;

    const bank = await bankLookup.findById(input.bankId);
    if (!bank || bank.organizationId !== organizationId || bank.status !== "ACTIVE") {
      throw new InvalidBankReferenceError(input.bankId);
    }

    const productType = await repository.findProductTypeById(input.loanProductTypeId);
    if (!productType || productType.organizationId !== organizationId || !productType.isActive) {
      throw new LoanProductTypeNotFoundError(input.loanProductTypeId);
    }

    const existing = await repository.findByBankTypeVariant(
      input.bankId,
      input.loanProductTypeId,
      input.variant,
    );
    if (existing) throw new DuplicateLoanProductError();

    const product = await repository.createWithAudit(
      {
        organizationId,
        bankId: input.bankId,
        loanProductTypeId: input.loanProductTypeId,
        variant: input.variant,
        name: input.name,
        status: input.status ?? "DRAFT",
        minInterestRate: input.minInterestRate,
        maxInterestRate: input.maxInterestRate,
        minTenureMonths: input.minTenureMonths,
        maxTenureMonths: input.maxTenureMonths,
        minLoanAmount: input.minLoanAmount,
        maxLoanAmount: input.maxLoanAmount,
        eligibilityRules: parseRules(input.eligibilityRulesJson),
      },
      actor,
      correlationId,
    );

    return toLoanProductDto(product);
  };
}
