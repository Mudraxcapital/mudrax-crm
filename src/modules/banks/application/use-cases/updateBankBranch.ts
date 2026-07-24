import type { BankRepository } from "../../domain/repositories/BankRepository";
import type { BanksAuditActor } from "../../domain/entities/BanksAuditRecord";
import {
  BankBranchNotFoundError,
  BankNotFoundError,
  DuplicateBankBranchCodeError,
} from "../../domain/errors/BankErrors";
import type { UpdateBankBranchInput } from "../validators/bankSchemas";
import { toBankBranchDto, type BankBranchDto } from "../dto/BankDto";

export interface UpdateBankBranchCommand {
  branchId: string;
  organizationId: string;
  input: UpdateBankBranchInput;
  actor: BanksAuditActor;
  correlationId?: string | null;
}

export function makeUpdateBankBranch(repository: BankRepository) {
  return async function updateBankBranch(
    command: UpdateBankBranchCommand,
  ): Promise<BankBranchDto> {
    const { branchId, organizationId, input, actor, correlationId } = command;

    const branch = await repository.findBranchById(branchId);
    if (!branch) throw new BankBranchNotFoundError(branchId);

    const bank = await repository.findById(branch.bankId);
    if (!bank || bank.organizationId !== organizationId) {
      throw new BankNotFoundError(branch.bankId);
    }

    if (input.code && input.code !== branch.code) {
      const existing = await repository.findBranchByCode(branch.bankId, input.code);
      if (existing) throw new DuplicateBankBranchCodeError(input.code);
    }

    const updated = await repository.updateBranchWithAudit(
      branchId,
      input,
      organizationId,
      actor,
      correlationId,
    );
    return toBankBranchDto(updated);
  };
}
