import type { BankRepository } from "../../domain/repositories/BankRepository";
import { BankNotFoundError } from "../../domain/errors/BankErrors";
import {
  toBankBranchDto,
  toBankDto,
  toCommissionPolicyVersionDto,
  type BankBranchDto,
  type BankDto,
  type CommissionPolicyVersionDto,
} from "../dto/BankDto";

export function makeGetBank(repository: BankRepository) {
  return async function getBank(bankId: string, organizationId: string): Promise<BankDto> {
    const bank = await repository.findById(bankId);
    if (!bank || bank.organizationId !== organizationId) {
      throw new BankNotFoundError(bankId);
    }
    return toBankDto(bank);
  };
}

export function makeListBanks(repository: BankRepository) {
  return async function listBanks(
    organizationId: string,
    filter?: { status?: BankDto["status"]; limit?: number; offset?: number },
  ): Promise<BankDto[]> {
    const banks = await repository.list(organizationId, filter);
    return banks.map(toBankDto);
  };
}

export function makeListBankBranches(repository: BankRepository) {
  return async function listBankBranches(bankId: string): Promise<BankBranchDto[]> {
    const branches = await repository.listBranches(bankId);
    return branches.map(toBankBranchDto);
  };
}

export function makeListCommissionPolicies(repository: BankRepository) {
  return async function listCommissionPolicies(
    bankId: string,
  ): Promise<CommissionPolicyVersionDto[]> {
    const policies = await repository.listPolicies(bankId);
    return policies.map(toCommissionPolicyVersionDto);
  };
}

export function makeGetEffectiveCommissionPolicy(repository: BankRepository) {
  return async function getEffectiveCommissionPolicy(
    bankId: string,
    loanProductId?: string | null,
  ): Promise<CommissionPolicyVersionDto | null> {
    const policy = await repository.findEffectivePolicy(bankId, loanProductId);
    return policy ? toCommissionPolicyVersionDto(policy) : null;
  };
}
