import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCampaigns } from "@/modules/campaigns";
import { CampaignForm } from "@/modules/campaigns/presentation/components/CampaignForm";
import { createCampaignAction } from "@/modules/campaigns/presentation/controllers/createCampaign.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { CreatePanel } from "../_components/CreatePanel";
import { CampaignsTable } from "./_components/CampaignsTable";

export default async function CampaignsPage() {
  const { authContext } = await requirePermission("campaign.view");
  const canManage = hasPermission(authContext, "campaign.manage");
  const campaigns = await listCampaigns(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Campaigns"
        description="Outbound lead-distribution campaigns and member allocations."
        breadcrumbs={[{ label: "Sales", href: "/crm" }, { label: "Campaigns" }]}
        actions={
          canManage ? (
            <CreatePanel
              triggerLabel="New campaign"
              title="Create campaign"
              description="Define schedule and ownership for lead distribution."
              width="lg"
            >
              <CampaignForm action={createCampaignAction} />
            </CreatePanel>
          ) : null
        }
      />
      <CampaignsTable
        rows={campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          dates: `${campaign.startDate ?? "—"} → ${campaign.endDate ?? "—"}`,
        }))}
      />
    </PageSection>
  );
}
