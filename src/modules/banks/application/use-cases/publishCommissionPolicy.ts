import type { BankRepository } from "../../domain/repositories/BankRepository";
import type { BanksAuditActor } from "../../domain/entities/BanksAuditRecord";
import {
  BankNotFoundError,
  CommissionPolicyNotFoundError,
  InvalidCommissionPolicyTransitionError,
} from "../../domain/errors/BankErrors";
import { toCommissionPolicyVersionDto, type CommissionPolicyVersionDto } from "../dto/BankDto";

export interface PublishCommissionPolicyCommand {
  policyId: string;
  organizationId: string;
  actor: BanksAuditActor;
  correlationId?: string | null;
}

export function makePublishCommissionPolicy(repository: BankRepository) {
  return async function publishCommissionPolicy(
    command: PublishCommissionPolicyCommand,
  ): Promise<CommissionPolicyVersionDto> {
    const { policyId, organizationId, actor, correlationId } = command;

    const policy = await repository.findPolicyById(policyId);
    if (!policy) throw new CommissionPolicyNotFoundError(policyId);

    const bank = await repository.findById(policy.bankId);
    if (!bank || bank.organizationId !== organizationId) {
      throw new BankNotFoundError(policy.bankId);
    }

    if (policy.status !== "DRAFTED") {
      throw new InvalidCommissionPolicyTransitionError(policy.status, "EFFECTIVE");
    }

    const published = await repository.publishPolicyWithAudit(
      policyId,
      organizationId,
      actor,
      correlationId,
    );
    return toCommissionPolicyVersionDto(published);
  };
}
