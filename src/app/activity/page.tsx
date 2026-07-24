import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listUnifiedTimeline } from "@/modules/activity-timeline";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";
import { Timeline } from "@/shared/ui/Timeline";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Badge } from "@/shared/ui/Badge";

export default async function ActivityTimelinePage() {
  const { authContext } = await requireAuth();

  const includeLeads = hasPermission(authContext, "lead.view");
  const includeFollowUps = hasPermission(authContext, "follow_up.view");
  const includeCampaigns = hasPermission(authContext, "campaign.view");
  const includeCalls = hasPermission(authContext, "call.view");

  const activity =
    includeLeads || includeFollowUps || includeCampaigns || includeCalls
      ? await listUnifiedTimeline(authContext.organizationId, 50, {
          includeLeads,
          includeFollowUps,
          includeCampaigns,
          includeCalls,
        })
      : [];

  return (
    <PageSection>
      <PageHeader
        title="Activity"
        description="Chronological CRM activity across leads, follow-ups, campaigns, and calls."
      />
      <Card>
        <CardBody>
          <Timeline
            items={activity.map((entry) => ({
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
