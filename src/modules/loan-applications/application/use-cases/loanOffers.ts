import type { LoanApplicationRepository } from "../../domain/repositories/LoanApplicationRepository";
import type { LoanApplicationsAuditActor } from "../../domain/entities/LoanApplicationsAuditRecord";
import type { CustomerLookupPort, LeadLookupPort, LoanProductLookupPort } from "../ports/LookupPorts";
import {
  ApplicationStatusNotFoundError,
  EligibilitySnapshotNotFoundError,
  InvalidCustomerReferenceError,
  InvalidLeadReferenceError,
  InvalidLoanProductReferenceError,
  InvalidOfferTransitionError,
  LoanOfferNotFoundError,
  OfferExpiredError,
} from "../../domain/errors/LoanApplicationErrors";
import type { CreateEligibilityInput, CreateLoanOfferInput, DecideLoanOfferInput } from "../validators/loanApplicationSchemas";
import {
  toEligibilitySnapshotDto,
  toLoanApplicationDto,
  toLoanOfferDto,
  type EligibilitySnapshotDto,
  type LoanApplicationDto,
  type LoanOfferDto,
} from "../dto/LoanApplicationDto";

export function makeCreateEligibilitySnapshot(
  repository: LoanApplicationRepository,
  customers: CustomerLookupPort,
) {
  return async function createEligibilitySnapshot(command: {
    organizationId: string;
    input: CreateEligibilityInput;
    actor: LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<EligibilitySnapshotDto> {
    const customer = await customers.findById(command.input.customerId);
    if (!customer || customer.organizationId !== command.organizationId) {
      throw new InvalidCustomerReferenceError(command.input.customerId);
    }
    const snapshot = await repository.createEligibilityWithAudit(command.organizationId, {
      loanApplicationId: command.input.loanApplicationId ?? null,
      customerId: command.input.customerId,
      method: command.input.method,
      inputsSnapshot: {
        monthlyIncome: command.input.monthlyIncome,
        monthlyObligations: command.input.monthlyObligations ?? "0",
      },
      decision: command.input.decision,
      computedCeilings: { maxEligibleAmount: command.input.maxEligibleAmount },
      computedByUserId: command.actor.actorId,
    }, command.actor, command.correlationId);
    return toEligibilitySnapshotDto(snapshot);
  };
}

export function makeCreateLoanOffer(repository: LoanApplicationRepository, products: LoanProductLookupPort) {
  return async function createLoanOffer(command: {
    organizationId: string;
    input: CreateLoanOfferInput;
    actor: LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanOfferDto> {
    const eligibility = await repository.findEligibilityById(command.input.eligibilitySnapshotId);
    if (!eligibility) throw new EligibilitySnapshotNotFoundError(command.input.eligibilitySnapshotId);
    const product = await products.findById(command.input.loanProductId);
    if (!product || product.organizationId !== command.organizationId || product.status !== "ACTIVE") {
      throw new InvalidLoanProductReferenceError(command.input.loanProductId);
    }
    const offer = await repository.createOfferWithAudit({
      organizationId: command.organizationId,
      leadId: command.input.leadId,
      eligibilitySnapshotId: command.input.eligibilitySnapshotId,
      bankId: command.input.bankId,
      loanProductId: command.input.loanProductId,
      offeredAmount: command.input.offeredAmount,
      offeredInterestRate: command.input.offeredInterestRate,
      offeredTenureMonths: command.input.offeredTenureMonths,
      expiresAt: command.input.expiresAt ? new Date(command.input.expiresAt) : null,
    }, command.actor, command.correlationId);
    return toLoanOfferDto(offer);
  };
}

export function makePresentLoanOffer(repository: LoanApplicationRepository) {
  return async function presentLoanOffer(command: {
    offerId: string;
    organizationId: string;
    actor: LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<LoanOfferDto> {
    const offer = await repository.findOfferById(command.offerId);
    if (!offer || offer.organizationId !== command.organizationId) throw new LoanOfferNotFoundError(command.offerId);
    if (offer.status !== "GENERATED") throw new InvalidOfferTransitionError(offer.status, "PRESENTED");
    const updated = await repository.updateOfferStatusWithAudit(
      offer.id, "PRESENTED", command.organizationId, command.actor, { presentedAt: new Date() }, command.correlationId,
    );
    return toLoanOfferDto(updated);
  };
}

export function makeDecideLoanOffer(
  repository: LoanApplicationRepository,
  customers: CustomerLookupPort,
  leads: LeadLookupPort,
  products: LoanProductLookupPort,
) {
  return async function decideLoanOffer(command: {
    offerId: string;
    organizationId: string;
    input: DecideLoanOfferInput;
    actor: LoanApplicationsAuditActor;
    correlationId?: string | null;
  }): Promise<{ offer: LoanOfferDto; application?: LoanApplicationDto }> {
    const offer = await repository.findOfferById(command.offerId);
    if (!offer || offer.organizationId !== command.organizationId) throw new LoanOfferNotFoundError(command.offerId);
    if (offer.status !== "GENERATED" && offer.status !== "PRESENTED") {
      throw new InvalidOfferTransitionError(offer.status, command.input.decision);
    }
    if (offer.expiresAt && offer.expiresAt.getTime() < Date.now()) throw new OfferExpiredError(offer.id);

    if (command.input.decision === "REJECT") {
      const declined = await repository.updateOfferStatusWithAudit(
        offer.id, "DECLINED", command.organizationId, command.actor, { decidedAt: new Date() }, command.correlationId,
      );
      return { offer: toLoanOfferDto(declined) };
    }

    const selected = await repository.updateOfferStatusWithAudit(
      offer.id, "SELECTED", command.organizationId, command.actor, { decidedAt: new Date() }, command.correlationId,
    );

    const eligibility = await repository.findEligibilityById(offer.eligibilitySnapshotId);
    if (!eligibility) throw new EligibilitySnapshotNotFoundError(offer.eligibilitySnapshotId);

    const draft = await repository.findStatusByBucket(command.organizationId, "DRAFT");
    if (!draft) throw new ApplicationStatusNotFoundError("DRAFT");
    const createdByUserId = command.actor.actorId;
    if (!createdByUserId) throw new Error("A user actor is required.");

    const lead = await leads.findById(offer.leadId);
    if (!lead || lead.organizationId !== command.organizationId) throw new InvalidLeadReferenceError(offer.leadId);
    const customer = await customers.findById(eligibility.customerId);
    if (!customer || customer.organizationId !== command.organizationId) {
      throw new InvalidCustomerReferenceError(eligibility.customerId);
    }
    const product = await products.findById(offer.loanProductId);
    if (!product) throw new InvalidLoanProductReferenceError(offer.loanProductId);

    const app = await repository.createWithAudit({
      organizationId: command.organizationId,
      customerId: eligibility.customerId,
      leadId: offer.leadId,
      loanProductId: offer.loanProductId,
      applicationStatusId: draft.id,
      loanOfferId: offer.id,
      requestedAmount: offer.offeredAmount,
      requestedTenureMonths: offer.offeredTenureMonths,
      createdByUserId,
    }, command.actor, command.correlationId);

    return { offer: toLoanOfferDto(selected), application: toLoanApplicationDto(app, draft) };
  };
}

export function makeListLoanOffers(repository: LoanApplicationRepository) {
  return async function listLoanOffers(organizationId: string, leadId: string): Promise<LoanOfferDto[]> {
    const offers = await repository.listOffersByLead(organizationId, leadId);
    return offers.map(toLoanOfferDto);
  };
}
