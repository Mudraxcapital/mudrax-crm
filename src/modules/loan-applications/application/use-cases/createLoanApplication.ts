import type { LoanApplicationRepository } from "../../domain/repositories/LoanApplicationRepository";
import type { LoanApplicationsAuditActor } from "../../domain/entities/LoanApplicationsAuditRecord";
import type { CustomerLookupPort, LeadLookupPort, LoanProductLookupPort } from "../ports/LookupPorts";
import {
  ApplicationStatusNotFoundError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  InvalidLoanProductReferenceError,
} from "../../domain/errors/LoanApplicationErrors";
import type { CreateLoanApplicationInput } from "../validators/loanApplicationSchemas";
import { toLoanApplicationDto, type LoanApplicationDto } from "../dto/LoanApplicationDto";

export function makeCreateLoanApplication(
  repository: LoanApplicationRepository,
  customers: CustomerLookupPort,
  leads: LeadLookupPort,
  products: LoanProductLookupPort,
) {
  return async function createLoanApplication(command: {
    organizationId: string;
    input: CreateLoanApplicationInput;
    actor: LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanApplicationDto> {
    const { organizationId, input, actor, correlationId } = command;
    const createdByUserId = actor.actorId;
    if (!createdByUserId) throw new Error("A user actor is required to create a Loan Application.");

    const customer = await customers.findById(input.customerId);
    if (!customer || customer.organizationId !== organizationId) throw new InvalidCustomerReferenceError(input.customerId);
    const lead = await leads.findById(input.leadId);
    if (!lead || lead.organizationId !== organizationId) throw new InvalidLeadReferenceError(input.leadId);
    const product = await products.findById(input.loanProductId);
    if (!product || product.organizationId !== organizationId || product.status !== "ACTIVE") {
      throw new InvalidLoanProductReferenceError(input.loanProductId);
    }

    const draft = await repository.findStatusByBucket(organizationId, "DRAFT");
    if (!draft) throw new ApplicationStatusNotFoundError("DRAFT");

    const app = await repository.createWithAudit({
      organizationId,
      customerId: input.customerId,
      leadId: input.leadId,
      loanProductId: input.loanProductId,
      bankBranchId: input.bankBranchId ?? null,
      applicationStatusId: draft.id,
      loanOfferId: input.loanOfferId ?? null,
      applicationType: input.applicationType ?? "STANDARD",
      originatingLoanAccountId: input.originatingLoanAccountId ?? null,
      requestedAmount: input.requestedAmount,
      requestedTenureMonths: input.requestedTenureMonths,
      createdByUserId,
    }, actor, correlationId);

    return toLoanApplicationDto(app, draft);
  };
}
