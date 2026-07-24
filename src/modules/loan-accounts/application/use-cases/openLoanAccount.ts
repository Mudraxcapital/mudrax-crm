import type { LoanAccountRepository } from "../../domain/repositories/LoanAccountRepository";
import type { LoanAccountsAuditActor } from "../../domain/entities/LoanAccountsAuditRecord";
import {
  LoanAccountAlreadyExistsError,
  LoanStatusNotFoundError,
} from "../../domain/errors/LoanAccountErrors";
import type { OpenLoanAccountInput } from "../validators/loanAccountSchemas";
import { toLoanAccountDto, type LoanAccountDto } from "../dto/LoanAccountDto";

export function makeOpenLoanAccount(repository: LoanAccountRepository) {
  return async function openLoanAccount(command: {
    organizationId: string;
    input: OpenLoanAccountInput;
    actor: LoanAccountsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanAccountDto> {
    const existing = await repository.findByOriginatingApplicationId(command.input.originatingApplicationId);
    if (existing) throw new LoanAccountAlreadyExistsError(command.input.originatingApplicationId);

    const active = await repository.findStatusByName(command.organizationId, "Active");
    if (!active) throw new LoanStatusNotFoundError("Active");

    const account = await repository.openWithAudit({
      organizationId: command.organizationId,
      originatingApplicationId: command.input.originatingApplicationId,
      customerId: command.input.customerId,
      bankId: command.input.bankId,
      bankBranchId: command.input.bankBranchId ?? null,
      loanProductId: command.input.loanProductId,
      loanStatusId: active.id,
      sanctionedAmount: command.input.sanctionedAmount,
      interestRateSnapshot: command.input.interestRateSnapshot,
      tenureMonthsSnapshot: command.input.tenureMonthsSnapshot,
    }, command.actor, command.correlationId);

    return toLoanAccountDto(account, active);
  };
}
