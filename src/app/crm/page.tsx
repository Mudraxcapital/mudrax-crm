import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { BarList } from "@/shared/ui/Charts";
import { Button } from "@/shared/ui/Button";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { leadHierarchyFilter, managerBookFilter, teamLeadCustomerLeadFilter } from "@/shared/auth/applyHierarchyListFilter";
import { loadCrmDashboard } from "./_lib/loadCrmDashboard";
import { CampaignDashboardFilter } from "./_components/CampaignDashboardFilter";

export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { authContext } = await requireAuth();
  const params = await searchParams;

  const canViewCustomers = hasPermission(authContext, "customer.view");
  const canViewLeads = hasPermission(authContext, "lead.view");
  const canViewCampaigns = hasPermission(authContext, "campaign.view");
  const canManageFields = hasPermission(authContext, "custom_field.manage");
  const book = managerBookFilter(authContext);
  const leadFilter = leadHierarchyFilter(authContext);
  const customerLeadFilter = teamLeadCustomerLeadFilter(authContext);

  const rawCampaignId =
    typeof params.campaignId === "string" && params.campaignId.trim()
      ? params.campaignId.trim()
      : null;

  const {
    campaigns,
    visibleCampaigns,
    selectedCampaignId,
    totalCustomers,
    totalLeads,
    leadsByStage,
    leadsBySource,
    campaignsByStatus,
  } = await loadCrmDashboard({
    organizationId: authContext.organizationId,
    book,
    leadFilter,
    customerLeadFilter,
    campaignId: rawCampaignId,
    canViewCustomers,
    canViewLeads,
    canViewCampaigns,
  });

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

      {canViewCampaigns ? (
        <CampaignDashboardFilter
          campaigns={campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
          }))}
          selectedCampaignId={selectedCampaignId}
        />
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canViewCustomers ? <StatCard label="Total Customers" value={totalCustomers} /> : null}
        {canViewLeads ? <StatCard label="Total Leads" value={totalLeads} /> : null}
        {canViewCampaigns ? (
          <StatCard label="Campaigns" value={visibleCampaigns.length} />
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
              description={`${visibleCampaigns.length} total`}
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
    </PageSection>
  );
}
