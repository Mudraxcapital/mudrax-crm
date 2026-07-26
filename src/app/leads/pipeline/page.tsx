import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { countLeads, getKanbanBoard, leadCatalogs } from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { LeadKanbanBoard } from "@/modules/leads/presentation/components/LeadKanbanBoard";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { TabNav } from "@/shared/ui/Tabs";
import { leadHierarchyFilter, managerBookFilter } from "@/shared/auth/applyHierarchyListFilter";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";
import { CampaignPipelineFilter } from "./_components/CampaignPipelineFilter";

export default async function LeadPipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requirePermission("lead.view");
  const canImport = hasPermission(authContext, "lead.import");
  const canViewCampaigns = hasPermission(authContext, "campaign.view");
  const scope = getPermissionScope(authContext, "lead.view");
  const hierarchyFilter = leadHierarchyFilter(authContext);
  const params = await searchParams;

  const rawCampaignId =
    typeof params.campaignId === "string" && params.campaignId.trim()
      ? params.campaignId.trim()
      : null;
  const showAll = rawCampaignId?.toLowerCase() === "all";

  const campaigns = canViewCampaigns
    ? await listCampaigns(authContext.organizationId, managerBookFilter(authContext))
    : [];

  const campaignOptions = await Promise.all(
    excludeTestCatalogRows(campaigns).map(async (campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      leadCount: await countLeads(authContext.organizationId, {
        campaignId: campaign.id,
        ...hierarchyFilter,
        ...(scope === "SELF" ? { assignedToUserIds: [session.user.id] } : {}),
      }),
    })),
  );

  // Default to the campaign with the most leads (campaign-wise board).
  const defaultCampaignId =
    campaignOptions.length > 0
      ? [...campaignOptions].sort(
          (a, b) => b.leadCount - a.leadCount || a.name.localeCompare(b.name),
        )[0]?.id ?? null
      : null;

  const effectiveCampaignId = showAll
    ? null
    : rawCampaignId && campaignOptions.some((campaign) => campaign.id === rawCampaignId)
      ? rawCampaignId
      : defaultCampaignId;

  const selectedCampaign = campaignOptions.find((campaign) => campaign.id === effectiveCampaignId);

  const filter = {
    ...hierarchyFilter,
    ...(scope === "SELF" ? { assignedToUserIds: [session.user.id] } : {}),
    ...(effectiveCampaignId ? { campaignId: effectiveCampaignId } : {}),
  };

  const [columns, lostReasons] = await Promise.all([
    getKanbanBoard(authContext.organizationId, filter),
    leadCatalogs.listLostReasons(authContext.organizationId),
  ]);

  const totalOnBoard = columns.reduce((sum, column) => sum + column.totalCount, 0);

  return (
    <PageSection>
      <PageHeader
        title="Lead Pipeline"
        description={
          selectedCampaign
            ? `${selectedCampaign.name} · ${totalOnBoard.toLocaleString()} leads`
            : `All campaigns · ${totalOnBoard.toLocaleString()} leads`
        }
        breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Pipeline" }]}
      />
      <TabNav
        activeHref="/leads/pipeline"
        items={[
          { href: "/leads", label: "All Leads" },
          { href: "/leads/pipeline", label: "Pipeline" },
          ...(canImport ? [{ href: "/leads/import", label: "Add from Excel" }] : []),
        ]}
      />

      {campaignOptions.length > 0 ? (
        <CampaignPipelineFilter
          campaigns={campaignOptions}
          selectedCampaignId={effectiveCampaignId}
        />
      ) : (
        <div className="mx-card p-4">
          <p className="text-muted text-sm">
            No campaigns yet. Create a campaign when adding leads from Excel, then open Pipeline to
            work that campaign board.
          </p>
        </div>
      )}

      <LeadKanbanBoard columns={columns} lostReasons={lostReasons} />
    </PageSection>
  );
}
