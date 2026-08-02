/**
 * Caller workspace contracts for the mobile Caller app
 * (mirrors CallerWorkspaceDto from the web CRM).
 */

import type { CampaignStatus } from "./Campaign";
import type { StageBucket } from "./Lead";
import type { FollowUpStatus, FollowUpTriggerType } from "./Followup";

export interface CallerCampaignOption {
  id: string;
  name: string;
  status: CampaignStatus | string;
}

export interface CallerLeadQueueItem {
  id: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  currentStageName: string;
  currentStageBucket: StageBucket | string;
  campaignId: string | null;
  nextActionAt: string | null;
  leadSourceName: string;
}

export interface CallerProgress {
  assignedToday: number;
  pendingCalls: number;
  completedCalls: number;
  followUpsToday: number;
  callsToday: number;
}

export interface CallerCallHistoryRow {
  id: string;
  customerName: string;
  campaignName: string | null;
  status: string;
  callTime: string;
  durationSeconds: number | null;
  disposition: string | null;
  outcomeName: string | null;
  followUpAt: string | null;
  leadId: string | null;
}

export interface CallerFollowUpRow {
  id: string;
  leadId: string;
  leadName: string;
  scheduledFor: string;
  status: FollowUpStatus | string;
  triggerType: FollowUpTriggerType | string;
}

export interface CallerDashboard {
  campaigns: CallerCampaignOption[];
  selectedCampaignId: string | null;
  progress: CallerProgress;
  queue: CallerLeadQueueItem[];
  recentCalls: CallerCallHistoryRow[];
  followUps: CallerFollowUpRow[];
  loginAt: string;
  priorLoginSecondsToday: number;
  dayStartedAt: string;
}

export interface CallerWorkspaceLead {
  id: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  currentStageId: string;
  currentStageName: string;
  currentStageBucket: StageBucket | string;
  leadSourceName: string;
  campaignId: string | null;
  campaignName: string | null;
  customerId: string;
  nextLeadId: string | null;
  fieldValues: Record<string, string | undefined>;
  latestCallAttemptId: string | null;
  latestCallStatus: string | null;
  notes: { id: string; body: string; createdAt: string }[];
  followUps: CallerFollowUpRow[];
  timeline: { id: string; action: string; at: string; summary: string }[];
}

export interface CallerLeadStageOption {
  id: string;
  name: string;
  bucket: StageBucket | string;
  sortOrder: number;
  closeOutcome: "WON" | "LOST" | null;
}

export interface CallerLostReasonOption {
  id: string;
  name: string;
}

export interface CallerCatalog {
  stages: CallerLeadStageOption[];
  lostReasons: CallerLostReasonOption[];
}

export type CallDisposition =
  | "ANSWERED"
  | "NO_ANSWER"
  | "BUSY"
  | "FAILED"
  | "VOICEMAIL"
  | "CONGESTION";

export type CallStatus =
  | "INITIATING"
  | "RINGING"
  | "ANSWERED"
  | "ON_HOLD"
  | "TRANSFERRING"
  | "CONFERENCING"
  | "COMPLETED"
  | "NO_ANSWER"
  | "BUSY"
  | "FAILED"
  | "ABANDONED";

export interface CallAttempt {
  id: string;
  organizationId: string;
  leadId: string | null;
  customerId: string | null;
  agentUserId: string | null;
  direction: string;
  status: CallStatus | string;
  disposition: CallDisposition | string | null;
  callOutcomeId: string | null;
  callOutcomeName: string | null;
  retryOfCallAttemptId: string | null;
  callerIdUsed: string | null;
  providerCallId: string | null;
  initiatedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  organizationId: string;
  category: string;
  templateId: string;
  templateCode: string | null;
  channelType: string | null;
  templateVersionId: string;
  recipientType: string;
  recipientId: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
}
