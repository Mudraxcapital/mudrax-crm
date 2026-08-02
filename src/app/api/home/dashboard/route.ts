// ============================================================================
// Home dashboard for any authenticated CRM staff user (mobile + future clients).
// Mirrors src/app/page.tsx data loading — Caller workspace vs enterprise home.
// ============================================================================

import { NextResponse } from "next/server";
import { requireApiUser } from "@/infra/auth/apiGuard";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { countCustomers } from "@/modules/customers";
import { countLeads, getLeadsByStage, listLeads } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { listFollowUps } from "@/modules/follow-ups";
import { listNotifications } from "@/modules/notifications";
import { getCallerDashboard } from "@/modules/caller-workspace";
import {
  followUpListFilter,
  leadHierarchyFilter,
  managerBookFilter,
  resolveCustomerListOptions,
} from "@/shared/auth/applyHierarchyListFilter";
import { notificationRecipientFilter } from "@/shared/auth/notificationRecipientFilter";

const QUICK_LINKS = [
  { href: "/customers", label: "Customers", desc: "Identity records", perm: "customer.view" },
  { href: "/leads", label: "All Leads", desc: "Pipeline inquiries", perm: "lead.view" },
  { href: "/leads/pipeline", label: "Pipeline", desc: "Kanban board", perm: "lead.view" },
  { href: "/leads/import", label: "Add from Excel", desc: "Bulk lead upload", perm: "lead.import" },
  { href: "/campaigns", label: "Campaigns", desc: "Outbound distribution", perm: "campaign.view" },
  {
    href: "/telephony",
    label: "Call Logs",
    desc: "Call operations",
    perm: "telephony.dashboard.view",
  },
  {
    href: "/documents",
    label: "Documents",
    desc: "Files & verification",
    perm: "documents.dashboard.view",
  },
  {
    href: "/notifications",
    label: "Notifications",
    desc: "Email · SMS · WhatsApp",
    perm: "notifications.dashboard.view",
  },
  { href: "/reports", label: "Reports", desc: "Analytics & KPIs", perm: "report.view" },
  { href: "/loans", label: "Loans", desc: "Applications & accounts", perm: "loan_application.view" },
  { href: "/users", label: "User Management", desc: "Employees & roles", perm: "user.view" },
  { href: "/crm", label: "CRM Overview", desc: "Operational dashboard", perm: null },
  { href: "/follow-ups", label: "Follow-ups", desc: "Scheduled work", perm: "follow_up.view" },
] as const;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameLocalDay(iso: string | null | undefined, day: Date): boolean {
  if (!iso) return false;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return false;
  return (
    value.getFullYear() === day.getFullYear() &&
    value.getMonth() === day.getMonth() &&
    value.getDate() === day.getDate()
  );
}

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;
  const { current } = auth;
  const { session, authContext } = current;
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");

  if (isCallerWorkspaceUser(authContext)) {
    try {
      const dashboard = await getCallerDashboard({
        organizationId: authContext.organizationId,
        callerUserId: session.user.id,
        loginAt: session.user.loginAt ?? new Date().toISOString(),
        currentSessionId: session.user.sessionId || null,
        campaignId: campaignId || null,
      });
      return NextResponse.json({
        data: {
          kind: "caller" as const,
          fullName: session.user.fullName,
          roles: authContext.roles.map((role) => role.name),
          caller: dashboard,
        },
      });
    } catch (error) {
      console.error("[api/home/dashboard]", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load dashboard." },
        { status: 500 },
      );
    }
  }

  const canCustomers = hasPermission(authContext, "customer.view");
  const canLeads = hasPermission(authContext, "lead.view");
  const canCampaigns = hasPermission(authContext, "campaign.view");
  const canFollowUps = hasPermission(authContext, "follow_up.view");
  const canNotifications = hasPermission(authContext, "notification.view");
  const book = managerBookFilter(authContext);
  const leadFilter = leadHierarchyFilter(authContext);
  const customerOptions = canCustomers
    ? await resolveCustomerListOptions(authContext)
    : null;

  const today = startOfToday();

  const [totalCustomers, totalLeads, leadsByStage, campaigns, followUps, notifications, assigned] =
    await Promise.all([
      customerOptions
        ? countCustomers(authContext.organizationId, customerOptions)
        : Promise.resolve(0),
      canLeads ? countLeads(authContext.organizationId, leadFilter) : Promise.resolve(0),
      canLeads ? getLeadsByStage(authContext.organizationId, leadFilter) : Promise.resolve([]),
      canCampaigns ? listCampaigns(authContext.organizationId, book) : Promise.resolve([]),
      canFollowUps
        ? listFollowUps(authContext.organizationId, {
            ...followUpListFilter(authContext, {
              permissionCode: "follow_up.view",
              actorUserId: session.user.id,
            }),
            limit: 200,
            offset: 0,
          })
        : Promise.resolve([]),
      canNotifications
        ? listNotifications(
            authContext.organizationId,
            notificationRecipientFilter(authContext, {
              permissionCode: "notification.view",
              actorUserId: session.user.id,
              limit: 8,
              offset: 0,
            }) as Parameters<typeof listNotifications>[1],
          )
        : Promise.resolve([]),
      canLeads
        ? listLeads(authContext.organizationId, {
            ...leadFilter,
            assignedToUserIds: [session.user.id],
            limit: 12,
            offset: 0,
          })
        : Promise.resolve([]),
    ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const openFollowUps = followUps.filter(
    (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
  );
  const dueToday = openFollowUps.filter((item) => isSameLocalDay(item.scheduledFor, today));
  const completedToday = followUps.filter(
    (item) => item.status === "COMPLETED" && isSameLocalDay(item.completedAt, today),
  );

  const quickLinks = QUICK_LINKS.filter(
    (link) => link.perm === null || hasPermission(authContext, link.perm),
  ).map(({ href, label, desc }) => ({ href, label, desc }));

  return NextResponse.json({
    data: {
      kind: "staff" as const,
      fullName: session.user.fullName,
      email: session.user.email ?? "",
      roles: authContext.roles.map((role) => role.name),
      permissionCount: Object.keys(authContext.permissions).length,
      summary: {
        customers: canCustomers ? totalCustomers : null,
        leads: canLeads ? totalLeads : null,
        activeCampaigns: canCampaigns ? activeCampaigns : null,
        campaigns: canCampaigns ? campaigns.length : null,
      },
      leadsByStage: canLeads
        ? leadsByStage.map((entry) => ({
            stageId: entry.stageId,
            stageName: entry.stageName,
            count: entry.count,
          }))
        : [],
      campaignStats: canCampaigns
        ? {
            total: campaigns.length,
            active: activeCampaigns,
            byStatus: Array.from(
              campaigns.reduce((map, campaign) => {
                map.set(campaign.status, (map.get(campaign.status) ?? 0) + 1);
                return map;
              }, new Map<string, number>()),
            ).map(([status, count]) => ({ status, count })),
          }
        : null,
      followUpStats: canFollowUps
        ? {
            open: openFollowUps.length,
            dueToday: dueToday.length,
            completedToday: completedToday.length,
          }
        : null,
      quickLinks,
      assignedWork: canLeads
        ? assigned.map((lead) => ({
            id: lead.id,
            fullNameSnapshot: lead.fullNameSnapshot,
            currentStageName: lead.currentStageName,
            campaignId: lead.campaignId,
            nextActionAt: lead.nextActionAt,
          }))
        : [],
      recentFollowUps: canFollowUps
        ? dueToday.slice(0, 8).map((item) => ({
            id: item.id,
            leadId: item.leadId,
            scheduledFor: item.scheduledFor,
            status: item.status,
            triggerType: item.triggerType,
          }))
        : [],
      notifications: canNotifications
        ? notifications.map((item) => ({
            id: item.id,
            category: item.category,
            templateCode: item.templateCode,
            status: item.status,
            payload: item.payload,
            createdAt: item.createdAt,
          }))
        : [],
    },
  });
}
