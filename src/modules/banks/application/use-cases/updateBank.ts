import type { BankRepository } from "../../domain/repositories/BankRepository";
import type { BanksAuditActor } from "../../domain/entities/BanksAuditRecord";
import {
  BankNotFoundError,
  DuplicateBankCodeError,
  DuplicateBankNameError,
} from "../../domain/errors/BankErrors";
import type { UpdateBankInput } from "../validators/bankSchemas";
import { toBankDto, type BankDto } from "../dto/BankDto";

export interface UpdateBankCommand {
  bankId: string;
  organizationId: string;
  input: UpdateBankInput;
  actor: BanksAuditActor;
  correlationId?: string | null;
}

export function makeUpdateBank(repository: BankRepository) {
  return async function updateBank(command: UpdateBankCommand): Promise<BankDto> {
    const { bankId, organizationId, input, actor, correlationId } = command;

    const existing = await repository.findById(bankId);
    if (!existing || existing.organizationId !== organizationId) {
      throw new BankNotFoundError(bankId);
    }

    if (input.code && input.code !== existing.code) {
      const byCode = await repository.findByCode(organizationId, input.code);
      if (byCode) throw new DuplicateBankCodeError(input.code);
    }

    if (input.name && input.name !== existing.name) {
      const byName = await repository.findByName(organizationId, input.name);
      if (byName) throw new DuplicateBankNameError(input.name);
    }

    const updated = await repository.updateWithAudit(bankId, input, actor, correlationId);
    return toBankDto(updated);
  };
}
