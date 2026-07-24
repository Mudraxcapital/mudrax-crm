import type { LoanProductRepository } from "../../domain/repositories/LoanProductRepository";
import type { LoanProductsAuditActor } from "../../domain/entities/LoanProductsAuditRecord";
import { LoanProductNotFoundError } from "../../domain/errors/LoanProductErrors";
import type { UpdateLoanProductInput } from "../validators/loanProductSchemas";
import { toLoanProductDto, type LoanProductDto } from "../dto/LoanProductDto";

export interface UpdateLoanProductCommand {
  loanProductId: string;
  organizationId: string;
  input: UpdateLoanProductInput;
  actor: LoanProductsAuditActor;
  correlationId?: string | null;
}

export function makeUpdateLoanProduct(repository: LoanProductRepository) {
  return async function updateLoanProduct(
    command: UpdateLoanProductCommand,
  ): Promise<LoanProductDto> {
    const { loanProductId, organizationId, input, actor, correlationId } = command;
    const existing = await repository.findById(loanProductId);
    if (!existing || existing.organizationId !== organizationId) {
      throw new LoanProductNotFoundError(loanProductId);
    }

    let eligibilityRules = existing.eligibilityRules;
    if (input.eligibilityRulesJson !== undefined) {
      if (!input.eligibilityRulesJson.trim()) {
        eligibilityRules = null;
      } else {
        const parsed = JSON.parse(input.eligibilityRulesJson) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Eligibility rules must be a JSON object.");
        }
        eligibilityRules = parsed as Record<string, unknown>;
      }
    }

    const updated = await repository.updateWithAudit(
      loanProductId,
      {
        name: input.name,
        status: input.status,
        minInterestRate: input.minInterestRate,
        maxInterestRate: input.maxInterestRate,
        minTenureMonths: input.minTenureMonths,
        maxTenureMonths: input.maxTenureMonths,
        minLoanAmount: input.minLoanAmount,
        maxLoanAmount: input.maxLoanAmount,
        eligibilityRules,
      },
      actor,
      correlationId,
    );
    return toLoanProductDto(updated);
  };
}
