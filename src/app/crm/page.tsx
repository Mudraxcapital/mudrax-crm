import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { countCustomers } from "@/modules/customers";
import { countLeads, getLeadsByStage, getLeadsBySource } from "@/modules/leads";
import { CAMPAIGN_STATUSES, listCampaigns } from "@/modules/campaigns";
import { listRecentCrmActivity } from "../_lib/recentActivity";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Timeline } from "@/shared/ui/Timeline";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { leadHierarchyFilter, managerBookFilter } from "@/shared/auth/applyHierarchyListFilter";

export default async function CrmDashboardPage() {
  const { authContext } = await requireAuth();

  const canViewCustomers = hasPermission(authContext, "customer.view");
  const canViewLeads = hasPermission(authContext, "lead.view");
  const canViewCampaigns = hasPermission(authContext, "campaign.view");
  const canViewFollowUps = hasPermission(authContext, "follow_up.view");
  const canManageFields = hasPermission(authContext, "custom_field.manage");
  const book = managerBookFilter(authContext);
  const leadFilter = leadHierarchyFilter(authContext);

  const [totalCustomers, totalLeads, leadsByStage, leadsBySource, campaigns, activity] =
    await Promise.all([
      canViewCustomers ? countCustomers(authContext.organizationId, book) : Promise.resolve(0),
      canViewLeads ? countLeads(authContext.organizationId, leadFilter) : Promise.resolve(0),
      canViewLeads ? getLeadsByStage(authContext.organizationId) : Promise.resolve([]),
      canViewLeads ? getLeadsBySource(authContext.organizationId) : Promise.resolve([]),
      canViewCampaigns ? listCampaigns(authContext.organizationId, book) : Promise.resolve([]),
      listRecentCrmActivity(authContext.organizationId, 10, {
        includeLeads: canViewLeads,
        includeFollowUps: canViewFollowUps,
        includeCampaigns: canViewCampaigns,
      }),
    ]);

  const campaignsByStatus = CAMPAIGN_STATUSES.map((status) => ({
    status,
    count: campaigns.filter((campaign) => campaign.status === status).length,
  })).filter((entry) => entry.count > 0);

  return (
    <PageSection>
      <PageHeader
        title="CRM Dashboard"
        description="Operational overview of customers and related CRM activity."
        actions={
          <>
            {canManageFields ? (
              <Link href="/crm/field-settings">
                <Button variant="secondary">Lead Settings</Button>
              </Link>
            ) : null}
            {canViewLeads ? (
              <Link href="/leads">
                <Button variant="secondary">Leads</Button>
              </Link>
            ) : null}
            {canViewCustomers ? (
              <Link href="/customers">
                <Button>Customers</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canViewCustomers ? <StatCard label="Total Customers" value={totalCustomers} /> : null}
        {canViewLeads ? <StatCard label="Total Leads" value={totalLeads} /> : null}
        {canViewCampaigns ? (
          <StatCard label="Campaigns" value={campaigns.length} />
        ) : null}
        {canViewCampaigns ? (
          <StatCard
            label="Active Campaigns"
            value={campaignsByStatus.find((e) => e.status === "ACTIVE")?.count ?? 0}
          />
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {canViewLeads ? (
          <Card>
            <CardHeader title="Leads by stage" />
            <CardBody>
              <BarList
                data={leadsByStage.map((entry) => ({
                  key: entry.stageId,
                  label: `${entry.stageName}`,
                  value: entry.count,
                }))}
              />
            </CardBody>
          </Card>
        ) : null}

        {canViewLeads ? (
          <Card>
            <CardHeader title="Leads by source" />
            <CardBody>
              <BarList
                data={leadsBySource.map((entry) => ({
                  key: entry.sourceId,
                  label: entry.sourceName,
                  value: entry.count,
                }))}
              />
            </CardBody>
          </Card>
        ) : null}

        {canViewCampaigns ? (
          <Card>
            <CardHeader
              title="Campaign summary"
              description={`${campaigns.length} total`}
              actions={
                <Link href="/campaigns">
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              }
            />
            <CardBody className="space-y-2">
              {campaignsByStatus.length === 0 ? (
                <p className="text-muted text-sm">No campaigns yet.</p>
              ) : (
                campaignsByStatus.map((entry) => (
                  <div key={entry.status} className="flex items-center justify-between text-sm">
                    <Badge tone={statusTone(entry.status)} dot>
                      {entry.status}
                    </Badge>
                    <span className="font-medium tabular-nums">{entry.count}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          actions={
            <Link href="/activity">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          }
        />
        <CardBody>
          <Timeline
            items={activity.map((entry) => ({
              id: entry.id,
              title: entry.label,
              description: entry.source,
              timestamp: new Date(entry.occurredAt).toLocaleString(),
              tone: "info",
            }))}
            empty={
              <EmptyState
                title="No activity yet"
                description="Customer, lead, and campaign events will appear here."
              />
            }
          />
        </CardBody>
      </Card>
    </PageSection>
  );
}
