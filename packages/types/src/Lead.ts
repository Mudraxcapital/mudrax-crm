/**
 * Serializable Lead contract (mirrors LeadDto from the web CRM).
 * Dates are ISO-8601 strings as returned by existing /api/leads routes.
 */

export type StageBucket = "INITIAL" | "ACTIVE" | "CLOSED";

export interface Lead {
  id: string;
  organizationId: string;
  customerId: string;
  leadSourceId: string;
  leadSourceName: string;
  currentStageId: string;
  currentStageName: string;
  currentStageBucket: StageBucket;
  lostReasonId: string | null;
  lostReasonName: string | null;
  campaignId: string | null;
  currentAssigneeUserId: string | null;
  ownerManagerId: string | null;
  ownerTeamLeadId: string | null;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  nextActionAt: string | null;
  nextActionType: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present when list/detail payloads include custom field values. */
  fieldValues?: { internalKey: string; displayValue: string | null }[];
}

export interface LeadListResponse {
  data: Lead[];
  meta: {
    limit: number;
    offset: number;
  };
}

export interface LeadResponse {
  data: Lead;
}
