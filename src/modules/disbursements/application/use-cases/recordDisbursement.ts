import type { DisbursementRepository } from "../../domain/repositories/DisbursementRepository";
import type { DisbursementsAuditActor } from "../../domain/entities/DisbursementsAuditRecord";
import type {
  CommissionPolicyLookupPort,
  LoanAccountPort,
  LoanApplicationLookupPort,
  LoanProductLookupPort,
} from "../ports/DisbursementPorts";
import {
  ApplicationNotApprovedError,
  CommissionPolicyMissingError,
  DuplicateBankReferenceError,
} from "../../domain/errors/DisbursementErrors";
import type { RecordDisbursementInput } from "../validators/disbursementSchemas";
import { toDisbursementDto, type DisbursementDto } from "../dto/DisbursementDto";

function computeCommissionAmount(amount: string, rateStructure: Record<string, unknown>): string {
  const ratePercent = Number(rateStructure.ratePercent ?? 0);
  const value = (Number(amount) * ratePercent) / 100;
  return value.toFixed(2);
}

export function makeRecordDisbursement(
  repository: DisbursementRepository,
  applications: LoanApplicationLookupPort,
  products: LoanProductLookupPort,
  policies: CommissionPolicyLookupPort,
  loanAccounts: LoanAccountPort,
) {
  return async function recordDisbursement(command: {
    organizationId: string;
    input: RecordDisbursementInput;
    actor: DisbursementsAuditActor;
    correlationId?: string | null;
  }): Promise<DisbursementDto> {
    const { organizationId, input, actor, correlationId } = command;

    const application = await applications.findById(input.loanApplicationId);
    if (!application || application.organizationId !== organizationId) {
      throw new ApplicationNotApprovedError(input.loanApplicationId);
    }
    if (application.statusBucket !== "APPROVED" && application.statusBucket !== "DISBURSEMENT_PENDING" && application.statusBucket !== "CONVERTED") {
      throw new ApplicationNotApprovedError(input.loanApplicationId);
    }

    const product = await products.findById(application.loanProductId);
    if (!product) throw new Error("Loan Product missing for application.");

    const existingRef = await repository.findByBankReference(product.bankId, input.bankReferenceNumber);
    if (existingRef) throw new DuplicateBankReferenceError(input.bankReferenceNumber);

    let loanAccount = await loanAccounts.findByApplicationId(application.id);
    const trancheNumber = await repository.nextTrancheNumber(application.id);

    if (!loanAccount) {
      loanAccount = await loanAccounts.open({
        organizationId,
        originatingApplicationId: application.id,
        customerId: application.customerId,
        bankId: product.bankId,
        bankBranchId: application.bankBranchId,
        loanProductId: application.loanProductId,
        sanctionedAmount: application.requestedAmount,
        interestRateSnapshot: product.minInterestRate,
        tenureMonthsSnapshot: application.requestedTenureMonths,
      }, actor);
      await applications.markConverted(application.id, organizationId, actor);
    }

    const markDisbursed = input.markDisbursed ?? true;
    let disbursement = await repository.createWithAudit({
      organizationId,
      loanApplicationId: application.id,
      loanAccountId: loanAccount.id,
      bankId: product.bankId,
      bankReferenceNumber: input.bankReferenceNumber,
      amount: input.amount,
      trancheNumber,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      status: markDisbursed ? "DISBURSED" : "SCHEDULED_EXPECTED",
    }, actor, correlationId);

    if (markDisbursed) {
      disbursement = await repository.updateStatusWithAudit(
        disbursement.id,
        "DISBURSED",
        actor,
        { disbursedAt: new Date(), loanAccountId: loanAccount.id },
        correlationId,
      );
    }

    const policy = await policies.findEffective(product.bankId, application.loanProductId);
    if (!policy) throw new CommissionPolicyMissingError(product.bankId);

    const computedAmount = computeCommissionAmount(input.amount, policy.rateStructure);
    const commission = await repository.createCommissionWithAudit(organizationId, {
      disbursementId: disbursement.id,
      commissionPolicyVersionId: policy.id,
      rateSnapshot: policy.rateStructure,
      computedAmount,
      clawbackRuleSnapshot: policy.clawbackRule ?? { type: "NONE" },
    }, actor, correlationId);

    return toDisbursementDto(disbursement, commission);
  };
}
