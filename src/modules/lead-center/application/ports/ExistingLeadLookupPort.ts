// ============================================================================
// src/modules/lead-center/application/ports/ExistingLeadLookupPort.ts
//
// Read-only port so Lead Center can run duplicate detection against Campaign
// Leads without importing leads module internals.
// ============================================================================

export interface ExistingLeadSnapshot {
  id: string;
  customerId: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  currentStageId: string;
  currentStageName: string;
  stageBucket: string;
  stageSortOrder: number;
  updatedAt: Date;
}

export interface ExistingLeadLookupPort {
  listForDuplicateScan(
    organizationId: string,
    options?: { ownerManagerId?: string; ownerTeamLeadId?: string; limit?: number },
  ): Promise<ExistingLeadSnapshot[]>;
}
