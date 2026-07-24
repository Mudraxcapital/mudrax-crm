import type { DisbursementRepository } from "../../domain/repositories/DisbursementRepository";
import type { DisbursementsAuditActor } from "../../domain/entities/DisbursementsAuditRecord";
import {
  DisbursementNotFoundError,
  InvalidDisbursementTransitionError,
} from "../../domain/errors/DisbursementErrors";
import type { UpdateDisbursementStatusInput } from "../validators/disbursementSchemas";
import { toDisbursementDto, type DisbursementDto } from "../dto/DisbursementDto";

const ALLOWED: Record<string, string[]> = {
  SCHEDULED_EXPECTED: ["DISBURSED", "FAILED"],
  DISBURSED: ["RECONCILED", "REVERSED"],
  RECONCILED: ["REVERSED"],
  FAILED: [],
  REVERSED: [],
};

export function makeUpdateDisbursementStatus(repository: DisbursementRepository) {
  return async function updateDisbursementStatus(command: {
    disbursementId: string;
    organizationId: string;
    input: UpdateDisbursementStatusInput;
    actor: DisbursementsAuditActor;
    correlationId?: string | null;
  }): Promise<DisbursementDto> {
    const existing = await repository.findById(command.disbursementId);
    if (!existing || existing.organizationId !== command.organizationId) {
      throw new DisbursementNotFoundError(command.disbursementId);
    }
    const allowed = ALLOWED[existing.status] ?? [];
    if (!allowed.includes(command.input.status)) {
      throw new InvalidDisbursementTransitionError(existing.status, command.input.status);
    }
    const extras: Parameters<DisbursementRepository["updateStatusWithAudit"]>[3] = {};
    if (command.input.status === "DISBURSED") extras.disbursedAt = new Date();
    if (command.input.status === "RECONCILED") extras.reconciledAt = new Date();
    if (command.input.status === "REVERSED") {
      extras.reversedAt = new Date();
      extras.reversalReason = command.input.reversalReason ?? null;
    }
    const updated = await repository.updateStatusWithAudit(
      existing.id, command.input.status, command.actor, extras, command.correlationId,
    );
    const commission = await repository.findCommissionByDisbursementId(updated.id);
    return toDisbursementDto(updated, commission);
  };
}
