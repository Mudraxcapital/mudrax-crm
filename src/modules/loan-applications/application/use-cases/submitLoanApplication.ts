import type { LoanApplicationRepository } from "../../domain/repositories/LoanApplicationRepository";
import type { LoanApplicationsAuditActor } from "../../domain/entities/LoanApplicationsAuditRecord";
import {
  ApplicationStatusNotFoundError,
  InvalidApplicationTransitionError,
  LoanApplicationNotFoundError,
} from "../../domain/errors/LoanApplicationErrors";
import { toLoanApplicationDto, type LoanApplicationDto } from "../dto/LoanApplicationDto";

export function makeSubmitLoanApplication(repository: LoanApplicationRepository) {
  return async function submitLoanApplication(command: {
    applicationId: string;
    organizationId: string;
    actor: LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanApplicationDto> {
    const app = await repository.findById(command.applicationId);
    if (!app || app.organizationId !== command.organizationId) throw new LoanApplicationNotFoundError(command.applicationId);
    const current = await repository.findStatusById(app.applicationStatusId);
    if (!current || current.bucket !== "DRAFT") {
      throw new InvalidApplicationTransitionError(current?.bucket ?? "unknown", "SUBMITTED");
    }
    const submitted = await repository.findStatusByBucket(command.organizationId, "SUBMITTED");
    if (!submitted) throw new ApplicationStatusNotFoundError("SUBMITTED");
    const updated = await repository.updateWithAudit(app.id, {
      applicationStatusId: submitted.id,
      submittedAt: new Date(),
    }, command.actor, command.correlationId);
    return toLoanApplicationDto(updated, submitted);
  };
}
