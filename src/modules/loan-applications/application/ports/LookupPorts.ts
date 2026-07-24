export interface IdOrgRef { id: string; organizationId: string; status?: string; }
export interface CustomerLookupPort { findById(id: string): Promise<IdOrgRef | null>; }
export interface LeadLookupPort { findById(id: string): Promise<IdOrgRef | null>; }
export interface LoanProductLookupPort { findById(id: string): Promise<(IdOrgRef & { bankId: string }) | null>; }
export interface DashboardMetricsPort {
  getDisbursementTotals(organizationId: string): Promise<{ totalDisbursed: string; commissionPending: string; commissionReceived: string }>;
  getTopBanks(organizationId: string): Promise<{ bankId: string; bankName: string; applicationCount: number }[]>;
}
