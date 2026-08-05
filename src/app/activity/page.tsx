import { forbidCallerWorkspace } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listUnifiedTimeline } from "@/modules/activity-timeline";
import { listLeads } from "@/modules/leads";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";
import { Timeline } from "@/shared/ui/Timeline";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Badge } from "@/shared/ui/Badge";
import { visibleLeadsFilter } from "@/shared/auth/applyHierarchyListFilter";

export default async function ActivityTimelinePage() {
  const { authContext } = await forbidCallerWorkspace();

  const includeLeads = hasPermission(authContext, "lead.view");
  const includeFollowUps = hasPermission(authContext, "follow_up.view");
  const includeCampaigns = hasPermission(authContext, "campaign.view");
  const includeCalls = hasPermission(authContext, "call.view");

  const unrestricted =
    authContext.hierarchy.unrestricted || authContext.hierarchy.primaryRole === "Admin";

  const activity =
    includeLeads || includeFollowUps || includeCampaigns || includeCalls
      ? await listUnifiedTimeline(authContext.organizationId, 200, {
          includeLeads,
          includeFollowUps,
          includeCampaigns,
          includeCalls,
        })
      : [];

  let visibleActivity = activity;
  if (!unrestricted && activity.length > 0) {
    const leadFilter = visibleLeadsFilter(authContext, {
      permissionCode: "lead.view",
      actorUserId: authContext.userId,
    });
    const visibleLeads = includeLeads
      ? await listLeads(authContext.organizationId, { ...leadFilter, limit: 50_000 })
      : [];
    const leadIds = new Set(visibleLeads.map((lead) => lead.id));
    const agentIds = new Set(authContext.hierarchy.visibleUserIds ?? [authContext.userId]);

    visibleActivity = activity
      .filter((entry) => {
        if (entry.leadId && leadIds.has(entry.leadId)) return true;
        if (entry.source === "Campaign" && includeCampaigns) {
          // Campaign activity is manager-book scoped at list time for TL via campaigns page;
          // keep campaign audit visible when actor can view campaigns (book filtered elsewhere).
          return (
            authContext.hierarchy.primaryRole === "Manager" ||
            authContext.hierarchy.primaryRole === "Team Lead"
          );
        }
        if (entry.source === "Call") {
          // Call audit rows may not carry agent id in state — keep when lead-linked or self tree.
          if (entry.leadId) return leadIds.has(entry.leadId);
          return agentIds.size > 0;
        }
        if (entry.source === "FollowUp" && entry.leadId) return leadIds.has(entry.leadId);
        if (entry.source === "Lead" && entry.leadId) return leadIds.has(entry.leadId);
        return false;
      })
      .slice(0, 50);
  }

  return (
    <PageSection>
      <PageHeader
        title="Activity"
        description="Chronological CRM activity across leads, follow-ups, campaigns, and calls."
      />
      <Card>
        <CardBody>
          <Timeline
            items={visibleActivity.map((entry) => ({
              id: entry.id,
              title: entry.label,
              description: entry.source,
              timestamp: entry.occurredAt.toLocaleString(),
              href: entry.leadId
                ? `/leads/${entry.leadId}`
                : entry.customerId
                  ? `/customers/${entry.customerId}`
                  : undefined,
              meta: <Badge tone="neutral">{entry.source}</Badge>,
              tone: "info",
            }))}
            empty={
              <EmptyState
                title="No activity yet"
                description="Events will appear here as your team works leads and campaigns."
              />
            }
          />
        </CardBody>
      </Card>
    </PageSection>
  );
}
