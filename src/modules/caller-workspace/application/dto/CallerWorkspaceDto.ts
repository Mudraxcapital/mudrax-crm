// ============================================================================
// src/modules/caller-workspace/application/dto/CallerWorkspaceDto.ts
// ============================================================================

export interface CallerCampaignOptionDto {
  id: string;
  name: string;
  status: string;
}

export interface CallerLeadQueueItemDto {
  id: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  currentStageName: string;
  currentStageBucket: string;
  campaignId: string | null;
  nextActionAt: string | null;
  leadSourceName: string;
}

export interface CallerProgressDto {
  assignedToday: number;
  pendingCalls: number;
  completedCalls: number;
  followUpsToday: number;
  callsToday: number;
}

export interface CallerDashboardDto {
  campaigns: CallerCampaignOptionDto[];
  selectedCampaignId: string | null;
  progress: CallerProgressDto;
  queue: CallerLeadQueueItemDto[];
  recentCalls: CallerCallHistoryRowDto[];
  followUps: CallerFollowUpRowDto[];
  loginAt: string;
}

export interface CallerCallHistoryRowDto {
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

export interface CallerFollowUpRowDto {
  id: string;
  leadId: string;
  leadName: string;
  scheduledFor: string;
  status: string;
  triggerType: string;
}

export interface CallerOutcomeCountDto {
  key: string;
  label: string;
  count: number;
}

export interface CallerTimeMetricsDto {
  loginAt: string | null;
  firstCallAt: string | null;
  lastCallAt: string | null;
  currentSessionSeconds: number;
  totalLoginSecondsToday: number;
  totalTalkTimeSeconds: number;
  averageCallDurationSeconds: number | null;
  longestCallSeconds: number | null;
  callsPerHour: number | null;
}

export interface CallerPerformanceDto {
  campaignId: string | null;
  cards: CallerOutcomeCountDto[];
  timeMetrics: CallerTimeMetricsDto;
}

export interface CallerWorkspaceLeadDto {
  id: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  currentStageId: string;
  currentStageName: string;
  currentStageBucket: string;
  leadSourceName: string;
  campaignId: string | null;
  campaignName: string | null;
  customerId: string;
  nextLeadId: string | null;
  notes: { id: string; body: string; createdAt: string }[];
  followUps: CallerFollowUpRowDto[];
  timeline: { id: string; action: string; at: string; summary: string }[];
}
