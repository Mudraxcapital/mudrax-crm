import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  AdminRoleProtectedError,
  getUser,
  InvalidUserHierarchyError,
  UserNotFoundError,
} from "@/modules/users";
import { getAssigneePortfolio, leadCatalogs } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { listCallAttempts } from "@/modules/telephony";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader, StatCard } from "@/shared/ui/Card";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { AssignedLeadsTable } from "./_components/AssignedLeadsTable";

function optionalParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export default async function EmployeeAssignedCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { session, authContext } = await requirePermission("lead.view");

  let user;
  try {
    // Portfolio pages follow the same hierarchy visibility as User Management.
    user = await getUser(id, {
      hierarchy: authContext.hierarchy,
      actorRoles: authContext.roles.map((role) => role.name),
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof UserNotFoundError) notFound();
    if (error instanceof InvalidUserHierarchyError || error instanceof AdminRoleProtectedError) {
      redirect("/unauthorized");
    }
    throw error;
  }

  const campaignId = optionalParam(query.campaignId);
  const stageId = optionalParam(query.stageId);
  const sourceId = optionalParam(query.sourceId);
  const dateFrom = optionalParam(query.dateFrom);
  const dateTo = optionalParam(query.dateTo);
  const search = optionalParam(query.search);

  const [portfolio, campaigns, stages, sources, calls] = await Promise.all([
    getAssigneePortfolio({
      organizationId: authContext.organizationId,
      userId: id,
      filter: {
        campaignId,
        currentStageId: stageId,
        leadSourceId: sourceId,
        dateFrom,
        dateTo,
        search,
      },
    }),
    listCampaigns(authContext.organizationId),
    leadCatalogs.listStages(authContext.organizationId),
    leadCatalogs.listSources(authContext.organizationId),
    listCallAttempts(authContext.organizationId, {
      agentUserId: id,
      limit: 20_000,
    }),
  ]);

  const campaignNameById = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));
  const lastCallByLead = new Map<string, string>();
  for (const call of calls) {
    if (!call.leadId) continue;
    const existing = lastCallByLead.get(call.leadId);
    if (!existing || call.initiatedAt > existing) {
      lastCallByLead.set(call.leadId, call.initiatedAt);
    }
  }

  const selectedCampaignName = campaignId
    ? (campaignNameById.get(campaignId) ?? "Campaign")
    : null;

  return (
    <PageSection>
      <PageHeader
        title={`${user.fullName} · Assigned Customers`}
        description={
          selectedCampaignName
            ? `Campaign: ${selectedCampaignName}`
            : "Portfolio of customers/leads currently assigned to this employee."
        }
        breadcrumbs={[
          { label: "User Management", href: "/users" },
          { label: user.fullName, href: `/users/${user.id}` },
          { label: "Assigned Customers" },
        ]}
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">{user.roleName ?? "Employee"}</Badge>
            <Badge tone={statusTone(user.status)} dot>
              {user.status}
            </Badge>
            {user.roleName === "Caller" ? (
              <Badge tone="info">
                {user.assignedTeamLeadName
                  ? `TL: ${user.assignedTeamLeadName}`
                  : "Direct Admin"}
              </Badge>
            ) : null}
          </div>
        }
        actions={
          <>
            <Link href={`/users/${user.id}`}>
              <Button variant="secondary">Employee Profile</Button>
            </Link>
            <Link href="/reports/caller-leaderboard">
              <Button variant="secondary">Caller Reports</Button>
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Assigned Leads" value={portfolio.summary.assignedLeads} />
        <StatCard label="Pending" value={portfolio.summary.pending} />
        <StatCard label="Completed" value={portfolio.summary.completed} />
        <StatCard label="Connected" value={portfolio.summary.connected} />
        <StatCard label="Follow Ups" value={portfolio.summary.followUps} />
        <StatCard label="Won" value={portfolio.summary.won} />
        <StatCard label="Lost" value={portfolio.summary.lost} />
      </section>

      <Card>
        <CardHeader title="Filters" description="Lead status, date, campaign, source." />
        <CardBody>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-sm">
              Search
              <input
                name="search"
                defaultValue={search ?? ""}
                placeholder="Name or phone…"
                className="mx-input mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              Lead Status
              <select
                name="stageId"
                defaultValue={stageId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All statuses</option>
                {stages
                  .filter((stage) => stage.isActive)
                  .map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Campaign
              <select
                name="campaignId"
                defaultValue={campaignId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All campaigns</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Source
              <select
                name="sourceId"
                defaultValue={sourceId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All sources</option>
                {sources
                  .filter((source) => source.isActive)
                  .map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              From
              <input
                type="date"
                name="dateFrom"
                defaultValue={dateFrom?.slice(0, 10) ?? ""}
                className="mx-input mt-1 w-full"
              />
            </label>
            <label className="text-sm">
              To
              <input
                type="date"
                name="dateTo"
                defaultValue={dateTo?.slice(0, 10) ?? ""}
                className="mx-input mt-1 w-full"
              />
            </label>
            <div className="flex items-end xl:col-span-6">
              <button type="submit" className="mx-btn mx-btn-primary">
                Apply filters
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Assigned Customers"
          description={`${portfolio.leads.length} lead(s)`}
        />
        <CardBody>
          <AssignedLeadsTable
            rows={portfolio.leads.map((lead) => ({
              id: lead.id,
              customerName: lead.fullNameSnapshot,
              phone: lead.phoneSnapshot,
              status: lead.currentStageName,
              lastCall: lastCallByLead.get(lead.id) ?? null,
              nextFollowUp: lead.nextActionAt,
              assignedDate: lead.createdAt,
              campaignName: lead.campaignId
                ? (campaignNameById.get(lead.campaignId) ?? null)
                : null,
              sourceName: lead.leadSourceName,
            }))}
          />
        </CardBody>
      </Card>
    </PageSection>
  );
}
