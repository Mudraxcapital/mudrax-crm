import type { BankRepository } from "../../domain/repositories/BankRepository";
import type { BanksAuditActor } from "../../domain/entities/BanksAuditRecord";
import { DuplicateBankCodeError, DuplicateBankNameError } from "../../domain/errors/BankErrors";
import type { CreateBankInput } from "../validators/bankSchemas";
import { toBankDto, type BankDto } from "../dto/BankDto";

export interface CreateBankCommand {
  organizationId: string;
  input: CreateBankInput;
  actor: BanksAuditActor;
  correlationId?: string | null;
}

export function makeCreateBank(repository: BankRepository) {
  return async function createBank(command: CreateBankCommand): Promise<BankDto> {
    const { organizationId, input, actor, correlationId } = command;

    const byCode = await repository.findByCode(organizationId, input.code);
    if (byCode) throw new DuplicateBankCodeError(input.code);

    const byName = await repository.findByName(organizationId, input.name);
    if (byName) throw new DuplicateBankNameError(input.name);

    const bank = await repository.createWithAudit(
      {
        organizationId,
        name: input.name,
        code: input.code,
        status: input.status ?? "ONBOARDED",
      },
      actor,
      correlationId,
    );

    return toBankDto(bank);
  };
}
