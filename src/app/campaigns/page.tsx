import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  getCampaignStatistics,
  listCampaignMembers,
  listCampaigns,
} from "@/modules/campaigns";
import { countLeads } from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { CampaignForm } from "@/modules/campaigns/presentation/components/CampaignForm";
import { createCampaignAction } from "@/modules/campaigns/presentation/controllers/createCampaign.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { CreatePanel } from "../_components/CreatePanel";
import { CampaignsTable } from "./_components/CampaignsTable";

export default async function CampaignsPage() {
  const { authContext } = await requirePermission("campaign.view");
  const canManage = hasPermission(authContext, "campaign.manage");
  const [campaigns, users] = await Promise.all([
    listCampaigns(authContext.organizationId),
    listUserSummaries(authContext.organizationId),
  ]);

  const userNameById = new Map(users.map((user) => [user.id, user.fullName]));

  const rows = await Promise.all(
    campaigns.map(async (campaign) => {
      const [stats, leadCount, members] = await Promise.all([
        getCampaignStatistics(campaign.id),
        countLeads(authContext.organizationId, { campaignId: campaign.id }),
        listCampaignMembers(campaign.id),
      ]);
      const source =
        campaign.description
          ?.split("\n")
          .find((line) => line.toLowerCase().startsWith("source:"))
          ?.replace(/^source:\s*/i, "") ?? "—";
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        source,
        totalLeads: leadCount,
        assignedAgents: stats.activeMemberCount || members.filter((m) => m.isActive).length,
        createdBy: userNameById.get(campaign.createdByUserId) ?? "—",
        dates: `${campaign.startDate ?? "—"} → ${campaign.endDate ?? "—"}`,
      };
    }),
  );

  return (
    <PageSection>
      <PageHeader
        title="Campaigns"
        description="Outbound lead-distribution campaigns, agents, import history, and analytics."
        breadcrumbs={[{ label: "Sales", href: "/crm" }, { label: "Campaigns" }]}
        actions={
          canManage ? (
            <CreatePanel
              triggerLabel="New campaign"
              title="Create campaign"
              description="Set source, priority, agents, and a distribution strategy."
              width="lg"
            >
              <CampaignForm
                action={createCampaignAction}
                agents={users
                  .filter((user) => user.status === "ACTIVE")
                  .map((user) => ({ id: user.id, fullName: user.fullName }))}
              />
            </CreatePanel>
          ) : null
        }
      />
      <CampaignsTable rows={rows} />
    </PageSection>
  );
}
