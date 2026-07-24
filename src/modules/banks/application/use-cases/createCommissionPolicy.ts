import type { BankRepository } from "../../domain/repositories/BankRepository";
import type { BanksAuditActor } from "../../domain/entities/BanksAuditRecord";
import { BankNotFoundError } from "../../domain/errors/BankErrors";
import type { CreateCommissionPolicyInput } from "../validators/bankSchemas";
import { toCommissionPolicyVersionDto, type CommissionPolicyVersionDto } from "../dto/BankDto";

export interface CreateCommissionPolicyCommand {
  bankId: string;
  organizationId: string;
  input: CreateCommissionPolicyInput;
  actor: BanksAuditActor;
  correlationId?: string | null;
}

export function makeCreateCommissionPolicy(repository: BankRepository) {
  return async function createCommissionPolicy(
    command: CreateCommissionPolicyCommand,
  ): Promise<CommissionPolicyVersionDto> {
    const { bankId, organizationId, input, actor, correlationId } = command;

    const bank = await repository.findById(bankId);
    if (!bank || bank.organizationId !== organizationId) {
      throw new BankNotFoundError(bankId);
    }

    const createdByUserId = actor.actorId;
    if (!createdByUserId) {
      throw new Error("A user actor is required to draft a Commission Policy Version.");
    }

    const policy = await repository.createPolicyWithAudit(
      {
        bankId,
        loanProductId: input.loanProductId ?? null,
        rateStructure: { type: "FLAT_PERCENT", ratePercent: input.ratePercent },
        clawbackWindowDays: input.clawbackWindowDays ?? null,
        clawbackRule: input.clawbackWindowDays
          ? { type: "FULL_WITHIN_WINDOW", windowDays: input.clawbackWindowDays }
          : null,
        createdByUserId,
      },
      organizationId,
      actor,
      correlationId,
    );

    return toCommissionPolicyVersionDto(policy);
  };
}
