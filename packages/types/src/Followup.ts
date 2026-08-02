/**
 * Serializable Follow-up contract (mirrors FollowUpDto from the web CRM).
 */

export type FollowUpTriggerType = "FOLLOW_UP" | "CALL_LATER";

export type FollowUpStatus =
  | "SCHEDULED"
  | "DUE"
  | "COMPLETED"
  | "MISSED"
  | "ESCALATED"
  | "CANCELLED";

export interface Followup {
  id: string;
  organizationId: string;
  leadId: string;
  triggerType: FollowUpTriggerType;
  status: FollowUpStatus;
  scheduledFor: string;
  currentAssigneeUserId: string;
  createdByUserId: string;
  completedAt: string | null;
  completedByUserId: string | null;
  outcomeNotes: string | null;
  missedAt: string | null;
  escalatedAt: string | null;
  escalatedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowupListResponse {
  data: Followup[];
  meta?: {
    limit?: number;
    offset?: number;
  };
}

export interface FollowupResponse {
  data: Followup;
}
