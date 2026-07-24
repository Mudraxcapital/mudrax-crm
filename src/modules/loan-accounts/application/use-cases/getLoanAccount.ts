import type { LoanAccountRepository } from "../../domain/repositories/LoanAccountRepository";
import type { LoanAccountsAuditActor } from "../../domain/entities/LoanAccountsAuditRecord";
import {
  InvalidLoanAccountTransitionError,
  LoanAccountNotFoundError,
  LoanStatusNotFoundError,
} from "../../domain/errors/LoanAccountErrors";
import { toLoanAccountDto, type LoanAccountDto } from "../dto/LoanAccountDto";

export function makeGetLoanAccount(repository: LoanAccountRepository) {
  return async function getLoanAccount(id: string, organizationId: string): Promise<LoanAccountDto> {
    const account = await repository.findById(id);
    if (!account || account.organizationId !== organizationId) throw new LoanAccountNotFoundError(id);
    const statuses = await repository.listStatuses(organizationId);
    const status = statuses.find((s) => s.id === account.loanStatusId) ?? null;
    return toLoanAccountDto(account, status);
  };
}

export function makeListLoanAccounts(repository: LoanAccountRepository) {
  return async function listLoanAccounts(
    organizationId: string,
    filter?: { customerId?: string; bankId?: string; limit?: number; offset?: number },
  ): Promise<LoanAccountDto[]> {
    const accounts = await repository.list(organizationId, filter);
    const statuses = await repository.listStatuses(organizationId);
    const byId = new Map(statuses.map((s) => [s.id, s]));
    return accounts.map((a) => toLoanAccountDto(a, byId.get(a.loanStatusId) ?? null));
  };
}

export function makeCloseLoanAccount(repository: LoanAccountRepository) {
  return async function closeLoanAccount(command: {
    accountId: string;
    organizationId: string;
    actor: LoanAccountsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanAccountDto> {
    const account = await repository.findById(command.accountId);
    if (!account || account.organizationId !== command.organizationId) {
      throw new LoanAccountNotFoundError(command.accountId);
    }
    if (account.closedAt) throw new InvalidLoanAccountTransitionError("Loan Account is already closed.");
    const closed = await repository.findStatusByName(command.organizationId, "Closed");
    if (!closed) throw new LoanStatusNotFoundError("Closed");
    const updated = await repository.closeWithAudit(command.accountId, command.actor, command.correlationId);
    return toLoanAccountDto(updated, closed);
  };
}

export function makeFindByOriginatingApplication(repository: LoanAccountRepository) {
  return async function findByOriginatingApplication(applicationId: string) {
    const account = await repository.findByOriginatingApplicationId(applicationId);
    if (!account) return null;
    return toLoanAccountDto(account);
  };
}
