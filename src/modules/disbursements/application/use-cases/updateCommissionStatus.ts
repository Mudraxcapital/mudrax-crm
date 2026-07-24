import type { DisbursementRepository } from "../../domain/repositories/DisbursementRepository";
import type { DisbursementsAuditActor } from "../../domain/entities/DisbursementsAuditRecord";
import {
  CommissionNotFoundError,
  InvalidCommissionTransitionError,
} from "../../domain/errors/DisbursementErrors";
import type { UpdateCommissionStatusInput } from "../validators/disbursementSchemas";
import { toCommissionDto, type CommissionDto } from "../dto/DisbursementDto";

const FLOW: Record<string, string[]> = {
  ACCRUED: ["INVOICED"],
  INVOICED: ["RECEIVED"],
  RECEIVED: ["RECONCILED"],
  RECONCILED: [],
};

export function makeUpdateCommissionStatus(repository: DisbursementRepository) {
  return async function updateCommissionStatus(command: {
    commissionId: string;
    organizationId: string;
    input: UpdateCommissionStatusInput;
    actor: DisbursementsAuditActor;
    correlationId?: string | null;
  }): Promise<CommissionDto> {
    const existing = await repository.findCommissionById(command.commissionId);
    if (!existing) throw new CommissionNotFoundError(command.commissionId);
    const allowed = FLOW[existing.status] ?? [];
    if (!allowed.includes(command.input.status)) {
      throw new InvalidCommissionTransitionError(existing.status, command.input.status);
    }
    const updated = await repository.updateCommissionStatusWithAudit(
      existing.id, command.input.status, command.organizationId, command.actor, command.correlationId,
    );
    return toCommissionDto(updated);
  };
}
