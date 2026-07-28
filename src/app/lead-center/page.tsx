import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { listLeadCenterDashboard } from "@/modules/lead-center";
import { LeadCenterWorkspace } from "@/modules/lead-center/presentation/components/LeadCenterWorkspace";
import { listCampaigns } from "@/modules/campaigns";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { managerBookFilter, leadHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";

/**
 * Lead Center — Facebook / Google / WhatsApp staging + campaign import.
 */
export default async function LeadCenterPage() {
  const { authContext } = await requirePermission("lead_center.view");
  if (isCallerWorkspaceUser(authContext)) {
    redirect("/caller/leads");
  }

  const canImport = hasPermission(authContext, "lead_center.import");
  const canCreateCampaign = hasPermission(authContext, "campaign.manage");
  const canViewIntegrations = hasPermission(authContext, "integration.view");
  const book = managerBookFilter(authContext);
  const ownership = leadHierarchyFilter(authContext);

  const [dashboard, campaigns] = await Promise.all([
    listLeadCenterDashboard(authContext.organizationId, {
      ownerManagerId: book.ownerManagerId,
      ownerTeamLeadId: ownership.ownerTeamLeadId,
      limit: 100,
    }),
    listCampaigns(authContext.organizationId, book),
  ]);

  const campaignOptions = campaigns
    .filter((campaign) => campaign.status !== "ARCHIVED" && campaign.status !== "COMPLETED")
    .map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
    }));

  return (
    <PageSection>
      <PageHeader
        title="Lead Center"
        description="Staging for Facebook, Google Ads, and WhatsApp leads. Import into a campaign when ready."
        actions={
          canViewIntegrations ? (
            <Link href="/integrations" className="text-muted text-sm hover:text-foreground underline">
              Integrations
            </Link>
          ) : null
        }
      />

      <p className="text-muted mt-4 text-sm">
        {dashboard.totalPending} pending across {dashboard.buckets.length} sources
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dashboard.buckets.map((bucket) => (
          <div key={bucket.code} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">{bucket.name}</p>
            <p className="text-muted mt-1 text-xs">
              {bucket.pendingCount} pending · {bucket.totalCount} total
            </p>
          </div>
        ))}
      </div>

      <LeadCenterWorkspace
        initialLeads={dashboard.recentLeads.map((lead) => ({
          id: lead.id,
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email,
          sourceCode: lead.sourceCode,
          campaignNameHint: lead.campaignNameHint,
          createdAt: lead.createdAt.toISOString(),
          status: lead.status,
          duplicateStatus: lead.duplicateStatus,
          validationStatus: lead.validationStatus,
          importStatus: lead.importStatus,
          tags: lead.tags,
        }))}
        campaigns={campaignOptions}
        canImport={canImport}
        canCreateCampaign={canCreateCampaign}
        canViewIntegrations={canViewIntegrations}
      />
    </PageSection>
  );
}
