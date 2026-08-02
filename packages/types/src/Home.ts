/**
 * Home dashboard contracts for CRM clients (mirrors / and /api/home/dashboard).
 */

import type { CallerDashboard } from "./Caller";

export interface AuthMeRole {
  id: string;
  name: string;
}

export interface AuthMeUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  mustChangePassword: boolean;
  sessionId: string;
  /** Present on /api/auth/me for profile UI (mobile). */
  phone?: string | null;
  /** Storage ref or absolute URL; resolve via /api/users/:id/photo when storage:. */
  profilePhotoUrl?: string | null;
}

export interface AuthMe {
  user: AuthMeUser;
  roles: AuthMeRole[];
  /** Effective permission codes (no scopes) — UI gating only; APIs re-check. */
  permissions: string[];
  hierarchy: {
    primaryRole: string | null;
    unrestricted: boolean;
  };
  isStaff: boolean;
  isCallerWorkspace: boolean;
}

export interface AuthMeResponse {
  data: AuthMe;
}

export interface HomeQuickLink {
  href: string;
  label: string;
  desc: string;
}

export interface HomeLeadStageStat {
  stageId: string;
  stageName: string;
  count: number;
}

export interface HomeCampaignStatusStat {
  status: string;
  count: number;
}

export interface HomeAssignedLead {
  id: string;
  fullNameSnapshot: string;
  currentStageName: string;
  campaignId: string | null;
  nextActionAt: string | null;
}

export interface HomeFollowUpRow {
  id: string;
  leadId: string;
  scheduledFor: string;
  status: string;
  triggerType: string;
}

export interface HomeNotificationRow {
  id: string;
  category: string;
  templateCode: string | null;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface StaffHomeDashboard {
  kind: "staff";
  fullName: string;
  email: string;
  roles: string[];
  permissionCount: number;
  summary: {
    customers: number | null;
    leads: number | null;
    activeCampaigns: number | null;
    campaigns: number | null;
  };
  leadsByStage: HomeLeadStageStat[];
  campaignStats: {
    total: number;
    active: number;
    byStatus: HomeCampaignStatusStat[];
  } | null;
  followUpStats: {
    open: number;
    dueToday: number;
    completedToday: number;
  } | null;
  quickLinks: HomeQuickLink[];
  assignedWork: HomeAssignedLead[];
  recentFollowUps: HomeFollowUpRow[];
  notifications: HomeNotificationRow[];
}

export interface CallerHomeDashboard {
  kind: "caller";
  fullName: string;
  roles: string[];
  caller: CallerDashboard;
}

export type HomeDashboard = StaffHomeDashboard | CallerHomeDashboard;

export interface HomeDashboardResponse {
  data: HomeDashboard;
}
