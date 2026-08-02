/**
 * Leaderboard page contracts (mirrors /api/leaderboard + web /leaderboard).
 */

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

export interface LeaderboardCard {
  id: string;
  kind: LeaderboardEntityKind;
  name: string;
  designation: string;
  rank: number | null;
  teamSize: number | null;
  profilePhotoUrl: string | null;
  metrics: LeaderboardMetricTriplet;
  memberUserIds: string[];
}

export interface LeaderboardNamedCount {
  key: string;
  label: string;
  count: number;
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

export interface LeaderboardDetail {
  entity: LeaderboardCard;
  email: string | null;
  status: string | null;
  managerName: string | null;
  teamLeadName: string | null;
  campaignNames: string[];
  summary: LeaderboardSummaryStats;
  stageDistribution: LeaderboardNamedCount[];
  lossReasons: LeaderboardNamedCount[];
  callOutcomes: LeaderboardNamedCount[];
  campaignContribution: LeaderboardNamedCount[];
  conversionTrend: LeaderboardNamedCount[];
  leadFunnel: LeaderboardNamedCount[];
}

export interface LeaderboardPage {
  viewerRole: LeaderboardViewerRole;
  isCallerOnly: boolean;
  dateFrom: string;
  dateTo: string;
  preset: string;
  sortBy: string;
  drillId: string | null;
  drillLabel: string | null;
  selectedId: string;
  cards: LeaderboardCard[];
  detail: LeaderboardDetail;
  filterOptions: {
    campaigns: Array<{ id: string; name: string }>;
    teamLeads: Array<{ id: string; name: string }>;
  };
}

export interface LeaderboardPageResponse {
  data: LeaderboardPage;
}

export type LeaderboardPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "this_year"
  | "custom";

export type LeaderboardSort =
  | "most_connections"
  | "most_calls"
  | "highest_conversion"
  | "longest_talk_time"
  | "most_follow_ups_completed"
  | "most_won_leads";

export interface LeaderboardQuery {
  preset?: LeaderboardPreset;
  sortBy?: LeaderboardSort;
  campaignId?: string | null;
  teamLeadId?: string | null;
  q?: string | null;
}
