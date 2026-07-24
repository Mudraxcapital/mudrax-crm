import type { BankRepository } from "../../domain/repositories/BankRepository";
import type { BanksAuditActor } from "../../domain/entities/BanksAuditRecord";
import {
  BankNotFoundError,
  DuplicateBankBranchCodeError,
} from "../../domain/errors/BankErrors";
import type { CreateBankBranchInput } from "../validators/bankSchemas";
import { toBankBranchDto, type BankBranchDto } from "../dto/BankDto";

export interface CreateBankBranchCommand {
  bankId: string;
  organizationId: string;
  input: CreateBankBranchInput;
  actor: BanksAuditActor;
  correlationId?: string | null;
}

export function makeCreateBankBranch(repository: BankRepository) {
  return async function createBankBranch(
    command: CreateBankBranchCommand,
  ): Promise<BankBranchDto> {
    const { bankId, organizationId, input, actor, correlationId } = command;

    const bank = await repository.findById(bankId);
    if (!bank || bank.organizationId !== organizationId) {
      throw new BankNotFoundError(bankId);
    }

    const existing = await repository.findBranchByCode(bankId, input.code);
    if (existing) throw new DuplicateBankBranchCodeError(input.code);

    const branch = await repository.createBranchWithAudit(
      {
        bankId,
        name: input.name,
        code: input.code,
        address: input.address ?? null,
        status: input.status ?? "ADDED",
      },
      organizationId,
      actor,
      correlationId,
    );

    return toBankBranchDto(branch);
  };
}
