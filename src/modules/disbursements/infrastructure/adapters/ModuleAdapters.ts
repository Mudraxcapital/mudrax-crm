import {
  findLoanApplicationById,
  getLoanApplication,
  markApplicationConverted,
} from "@/modules/loan-applications";
import { findLoanProductById } from "@/modules/loan-products";
import { getEffectiveCommissionPolicy } from "@/modules/banks";
import { findLoanAccountByApplication, openLoanAccount } from "@/modules/loan-accounts";
import type {
  CommissionPolicyLookupPort,
  LoanAccountPort,
  LoanApplicationLookupPort,
  LoanProductLookupPort,
  OpenLoanAccountCommand,
} from "../../application/ports/DisbursementPorts";
import type { DisbursementsAuditActor } from "../../domain/entities/DisbursementsAuditRecord";

export class LoanApplicationsModuleAdapter implements LoanApplicationLookupPort {
  async findById(id: string) {
    const app = await findLoanApplicationById(id);
    if (!app) return null;
    const dto = await getLoanApplication(app.id, app.organizationId);
    return {
      id: dto.id,
      organizationId: dto.organizationId,
      customerId: dto.customerId,
      loanProductId: dto.loanProductId,
      bankBranchId: dto.bankBranchId,
      statusBucket: dto.applicationStatusBucket ?? "DRAFT",
      requestedAmount: dto.requestedAmount,
      requestedTenureMonths: dto.requestedTenureMonths,
    };
  }

  async markConverted(
    applicationId: string,
    organizationId: string,
    actor: DisbursementsAuditActor,
  ) {
    await markApplicationConverted({ applicationId, organizationId, actor });
  }
}

export class LoanProductsModuleAdapter implements LoanProductLookupPort {
  async findById(id: string) {
    const product = await findLoanProductById(id);
    if (!product) return null;
    return {
      id: product.id,
      bankId: product.bankId,
      minInterestRate: product.minInterestRate,
      status: product.status,
    };
  }
}

export class BanksCommissionPolicyAdapter implements CommissionPolicyLookupPort {
  async findEffective(bankId: string, loanProductId?: string | null) {
    const policy = await getEffectiveCommissionPolicy(bankId, loanProductId);
    if (!policy) return null;
    return {
      id: policy.id,
      rateStructure: policy.rateStructure,
      clawbackRule: policy.clawbackRule,
    };
  }
}

export class LoanAccountsModuleAdapter implements LoanAccountPort {
  async findByApplicationId(applicationId: string) {
    const account = await findLoanAccountByApplication(applicationId);
    return account ? { id: account.id } : null;
  }

  async open(command: OpenLoanAccountCommand, actor: DisbursementsAuditActor) {
    const account = await openLoanAccount({
      organizationId: command.organizationId,
      input: {
        originatingApplicationId: command.originatingApplicationId,
        customerId: command.customerId,
        bankId: command.bankId,
        bankBranchId: command.bankBranchId ?? null,
        loanProductId: command.loanProductId,
        sanctionedAmount: command.sanctionedAmount,
        interestRateSnapshot: command.interestRateSnapshot,
        tenureMonthsSnapshot: command.tenureMonthsSnapshot,
      },
      actor,
    });
    return { id: account.id };
  }
}
