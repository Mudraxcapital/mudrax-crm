// ============================================================================
// src/modules/reports/application/dto/CallerLeaderboardDto.ts
// ============================================================================

export interface NamedMetricDto {
  key: string;
  label: string;
  value: number;
}

export interface CallerLeaderboardRowDto {
  rank: number;
  userId: string;
  employeeName: string;
  profilePhotoUrl: string | null;
  teamLeadName: string | null;
  teamLeadId: string | null;
  campaignNames: string[];
  primaryCampaignName: string | null;

  totalCalls: number;
  connectedCalls: number;
  notConnectedCalls: number;
  /** Dynamic Call Outcome catalog counts (key = outcome id). */
  outcomeMetrics: NamedMetricDto[];
  /** Dynamic Lead Stage catalog counts for currently assigned leads (key = stage id). */
  stageMetrics: NamedMetricDto[];
  interestedLeads: number;
  followUps: number;
  conversions: number;
  wonLeads: number;
  lostLeads: number;

  firstCallAt: string | null;
  lastCallAt: string | null;
  workingDurationSeconds: number;
  totalTalkTimeSeconds: number;
  averageTalkTimeSeconds: number | null;
  longestCallSeconds: number | null;
  shortestCallSeconds: number | null;
  idleTimeSeconds: number;

  callsPerHour: number;
  averageResponseTimeSeconds: number | null;
  averageFollowUpTimeSeconds: number | null;
  leadsClosed: number;
  pendingLeads: number;
  conversionRate: number;
}

export interface CallerLeaderboardHighlightDto {
  key: "top_caller" | "highest_connections" | "best_conversion" | "longest_talk";
  label: string;
  userId: string | null;
  employeeName: string | null;
  valueLabel: string;
}

export interface CallerLeaderboardDto {
  dateFrom: string;
  dateTo: string;
  preset: string;
  sortBy: string;
  /** Active Call Outcome columns (CRM metadata). */
  outcomeColumns: Array<{ key: string; label: string }>;
  /** Active Lead Stage columns used in stage metrics. */
  stageColumns: Array<{ key: string; label: string }>;
  highlights: CallerLeaderboardHighlightDto[];
  rows: CallerLeaderboardRowDto[];
}
