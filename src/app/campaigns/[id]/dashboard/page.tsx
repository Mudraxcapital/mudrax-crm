import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireInternalStaff } from "@/infra/auth/session";
import { leadCatalogs } from "@/modules/leads";
import { listCallOutcomes } from "@/modules/telephony";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { authorizeCampaignDashboard } from "./_lib/authorizeCampaignDashboard";
import {
  resolveCampaignDashboardRange,
  resolveProgressGranularity,
  resolveRangeBounds,
} from "./_lib/campaignDashboardRange";
import { loadCampaignDashboard } from "./_lib/loadCampaignDashboard";
import { CampaignDashboardClient } from "./_components/CampaignDashboardClient";

export default async function CampaignDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requireInternalStaff();
  const { id } = await params;
  const query = await searchParams;

  const access = await authorizeCampaignDashboard({
    authContext,
    campaignId: id,
  });
  if (!access) notFound();

  const range = resolveCampaignDashboardRange(query.range);
  const granularity = resolveProgressGranularity(query.granularity);
  const customFrom = typeof query.from === "string" ? query.from : null;
  const customTo = typeof query.to === "string" ? query.to : null;
  const { from, to } = resolveRangeBounds(range, {
    customFrom,
    customTo,
  });

  const callerOnly = isCallerWorkspaceUser(authContext);
  const canExportLeads =
    hasPermission(authContext, "lead.view") && !callerOnly && access.mode === "full";
  const canExportSummary = hasPermission(authContext, "export.create");
  const requestedAssigneeId =
    typeof query.assignee === "string" && query.assignee.trim()
      ? query.assignee.trim()
      : null;
  const requestedLeadId =
    typeof query.leadId === "string" && query.leadId.trim()
      ? query.leadId.trim()
      : null;
  const rawLeadPage =
    typeof query.leadPage === "string" ? Number.parseInt(query.leadPage, 10) : NaN;
  const requestedLeadPage =
    Number.isFinite(rawLeadPage) && rawLeadPage > 0 ? rawLeadPage : null;

  const [data, stages, lostReasons, callOutcomes] = await Promise.all([
    loadCampaignDashboard({
      organizationId: authContext.organizationId,
      authContext,
      campaign: access.campaign,
      mode: access.mode,
      rangeFrom: from,
      rangeTo: to,
      progressGranularity: granularity,
      canExportLeads,
      canExportSummary,
      requestedAssigneeId,
      requestedLeadId,
      requestedLeadPage,
    }),
    leadCatalogs.listStages(authContext.organizationId),
    leadCatalogs.listLostReasons(authContext.organizationId),
    listCallOutcomes(authContext.organizationId).catch(() => []),
  ]);

  return (
    <PageSection>
      <PageHeader
        title="Campaign Dashboard"
        description={
          access.mode === "self"
            ? "Your caller workspace — call, update status, note, follow-up, and next lead without leaving this screen."
            : "Operational workspace: all assignee leads load by default. Filter by employee from the assignees report when needed."
        }
        breadcrumbs={[
          { label: "Campaigns", href: callerOnly ? "/caller/campaigns" : "/campaigns" },
          { label: access.campaign.name },
          { label: "Dashboard" },
        ]}
        actions={
          <Link href={callerOnly ? "/caller/campaigns" : "/campaigns"}>
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="mx-card p-6">
            <p className="text-muted text-sm">Loading campaign workspace…</p>
          </div>
        }
      >
        <CampaignDashboardClient
          data={data}
          range={range}
          granularity={granularity}
          agentUserId={session.user.id}
          stages={stages}
          lostReasons={lostReasons}
          callOutcomes={callOutcomes.map((outcome) => ({
            id: outcome.id,
            name: outcome.name,
          }))}
          canCall={hasPermission(authContext, "call.initiate")}
          canUpdate={hasPermission(authContext, "lead.update")}
          canUpdateCall={hasPermission(authContext, "call.update")}
          canCreateFollowUp={hasPermission(authContext, "follow_up.create")}
          leadDetailHrefPrefix={callerOnly ? "/caller/leads" : "/leads"}
        />
      </Suspense>
    </PageSection>
  );
}
