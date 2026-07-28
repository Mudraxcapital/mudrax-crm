import type { LoanApplicationRepository } from "../../domain/repositories/LoanApplicationRepository";
import type { DashboardMetricsPort } from "../ports/LookupPorts";
import type { LoanDashboardDto } from "../dto/LoanApplicationDto";

export function makeGetLoanDashboard(
  repository: LoanApplicationRepository,
  metrics: DashboardMetricsPort,
) {
  return async function getLoanDashboard(organizationId: string): Promise<LoanDashboardDto> {
    const counts = await repository.countByStatusBucket(organizationId);
    const pending =
      (counts.DRAFT ?? 0) + (counts.SUBMITTED ?? 0) + (counts.UNDER_BANK_REVIEW ?? 0) + (counts.DISBURSEMENT_PENDING ?? 0);
    const active =
      pending + (counts.APPROVED ?? 0);
    const totals = await metrics.getDisbursementTotals(organizationId);
    const topBanks = await metrics.getTopBanks(organizationId);
    return {
      activeApplications: active,
      approved: (counts.APPROVED ?? 0) + (counts.CONVERTED ?? 0),
      rejected: counts.REJECTED ?? 0,
      pending,
      totalDisbursedAmount: totals.totalDisbursed,
      commissionPending: totals.commissionPending,
      commissionReceived: totals.commissionReceived,
      topBanks,
    };
  };
}
