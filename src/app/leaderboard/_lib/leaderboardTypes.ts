// ============================================================================
// Presentation types for the Leaderboard page (composition root only).
// ============================================================================

export type LeaderboardEntityKind = "summary" | "manager" | "team_lead" | "caller";

export type LeaderboardViewerRole = "Admin" | "Manager" | "Team Lead" | "Caller";

export interface LeaderboardMetricTriplet {
  totalCalls: number;
  connectedCalls: number;
  talkTimeSeconds: number;
  wonLeads: number;
  conversionRate: number;
  followUpsCompleted: number;
  customersContacted: number;
}

export interface LeaderboardCardDto {
  id: string;
  kind: LeaderboardEntityKind;
  name: string;
  designation: string;
  rank: number | null;
  teamSize: number | null;
  profilePhotoUrl: string | null;
  metrics: LeaderboardMetricTriplet;
  /** Child user ids rolled into this card (empty for leaf caller). */
  memberUserIds: string[];
}

export interface NamedCount {
  key: string;
  label: string;
  count: number;
}

export interface LeaderboardActivityItem {
  id: string;
  label: string;
  detail: string;
  occurredAt: string;
}

export interface LeaderboardSummaryStats {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  connectedCalls: number;
  attemptedCalls: number;
  missedCalls: number;
  averageCallDurationSeconds: number | null;
  totalTalkTimeSeconds: number;
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  followUpsCompleted: number;
  pendingFollowUps: number;
  customersContacted: number;
  leadsConverted: number;
  conversionRate: number;
}

export interface LeaderboardDetailDto {
  entity: LeaderboardCardDto;
  email: string | null;
  status: string | null;
  managerName: string | null;
  teamLeadName: string | null;
  campaignNames: string[];
  summary: LeaderboardSummaryStats;
  stageDistribution: NamedCount[];
  lossReasons: NamedCount[];
  callOutcomes: NamedCount[];
  campaignContribution: NamedCount[];
  conversionTrend: NamedCount[];
  leadFunnel: NamedCount[];
  recentActivity: LeaderboardActivityItem[];
}

export interface LeaderboardPageDto {
  viewerRole: LeaderboardViewerRole;
  isCallerOnly: boolean;
  dateFrom: string;
  dateTo: string;
  preset: string;
  sortBy: string;
  drillId: string | null;
  drillLabel: string | null;
  selectedId: string;
  cards: LeaderboardCardDto[];
  detail: LeaderboardDetailDto;
  filterOptions: {
    campaigns: Array<{ id: string; name: string }>;
    teamLeads: Array<{ id: string; name: string }>;
  };
}
