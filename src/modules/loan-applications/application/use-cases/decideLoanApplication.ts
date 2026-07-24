import type { LoanApplicationRepository } from "../../domain/repositories/LoanApplicationRepository";
import type { LoanApplicationsAuditActor } from "../../domain/entities/LoanApplicationsAuditRecord";
import {
  ApplicationStatusNotFoundError,
  InvalidApplicationTransitionError,
  LoanApplicationNotFoundError,
} from "../../domain/errors/LoanApplicationErrors";
import type { DecideLoanApplicationInput } from "../validators/loanApplicationSchemas";
import { toLoanApplicationDto, type LoanApplicationDto } from "../dto/LoanApplicationDto";

const DECIDABLE = new Set(["SUBMITTED", "UNDER_BANK_REVIEW", "DISBURSEMENT_PENDING"]);

export function makeDecideLoanApplication(repository: LoanApplicationRepository) {
  return async function decideLoanApplication(command: {
    applicationId: string;
    organizationId: string;
    input: DecideLoanApplicationInput;
    actor: LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanApplicationDto> {
    const app = await repository.findById(command.applicationId);
    if (!app || app.organizationId !== command.organizationId) throw new LoanApplicationNotFoundError(command.applicationId);
    const current = await repository.findStatusById(app.applicationStatusId);
    if (!current || !DECIDABLE.has(current.bucket)) {
      throw new InvalidApplicationTransitionError(current?.bucket ?? "unknown", command.input.decision);
    }
    const bucket = command.input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const next = await repository.findStatusByBucket(command.organizationId, bucket);
    if (!next) throw new ApplicationStatusNotFoundError(bucket);
    const updated = await repository.updateWithAudit(app.id, {
      applicationStatusId: next.id,
      decisionAt: new Date(),
      decidedByUserId: command.actor.actorId,
      rejectionReason: command.input.decision === "REJECT" ? (command.input.rejectionReason ?? null) : null,
    }, command.actor, command.correlationId);
    return toLoanApplicationDto(updated, next);
  };
}
