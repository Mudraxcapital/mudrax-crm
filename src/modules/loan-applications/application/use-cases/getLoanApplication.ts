import type { LoanApplicationRepository } from "../../domain/repositories/LoanApplicationRepository";
import { LoanApplicationNotFoundError } from "../../domain/errors/LoanApplicationErrors";
import {
  toLoanApplicationDto,
  type ApplicationStatusDto,
  type LoanApplicationDto,
} from "../dto/LoanApplicationDto";

export function makeGetLoanApplication(repository: LoanApplicationRepository) {
  return async function getLoanApplication(id: string, organizationId: string): Promise<LoanApplicationDto> {
    const app = await repository.findById(id);
    if (!app || app.organizationId !== organizationId) throw new LoanApplicationNotFoundError(id);
    const status = await repository.findStatusById(app.applicationStatusId);
    return toLoanApplicationDto(app, status);
  };
}

export function makeListLoanApplications(repository: LoanApplicationRepository) {
  return async function listLoanApplications(
    organizationId: string,
    filter?: { statusBucket?: string; customerId?: string; leadId?: string; limit?: number; offset?: number },
  ): Promise<LoanApplicationDto[]> {
    const apps = await repository.list(organizationId, filter);
    const statuses = await repository.listStatuses(organizationId);
    const byId = new Map(statuses.map((s) => [s.id, s]));
    return apps.map((app) => toLoanApplicationDto(app, byId.get(app.applicationStatusId) ?? null));
  };
}

export function makeListApplicationStatuses(repository: LoanApplicationRepository) {
  return async function listApplicationStatuses(organizationId: string): Promise<ApplicationStatusDto[]> {
    const statuses = await repository.listStatuses(organizationId);
    return statuses.map((s) => ({
      id: s.id, name: s.name, bucket: s.bucket, isTerminal: s.isTerminal, sortOrder: s.sortOrder,
    }));
  };
}

export function makeMarkApplicationConverted(repository: LoanApplicationRepository) {
  return async function markApplicationConverted(command: {
    applicationId: string;
    organizationId: string;
    actor: import("../../domain/entities/LoanApplicationsAuditRecord").LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanApplicationDto> {
    const app = await repository.findById(command.applicationId);
    if (!app || app.organizationId !== command.organizationId) throw new LoanApplicationNotFoundError(command.applicationId);
    const converted = await repository.findStatusByBucket(command.organizationId, "CONVERTED");
    if (!converted) throw new Error("CONVERTED application status is not configured.");
    const updated = await repository.updateWithAudit(app.id, {
      applicationStatusId: converted.id,
    }, command.actor, command.correlationId);
    return toLoanApplicationDto(updated, converted);
  };
}
