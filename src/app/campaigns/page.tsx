import { requirePermission } from "@/infra/auth/session";
import { hasPermission, isAssignableAgentRole } from "@/modules/rbac";
import {
  getCampaignStatistics,
  listCampaignMembers,
  listCampaigns,
} from "@/modules/campaigns";
import { countLeads } from "@/modules/leads";
import { listUsers, listUsersByRole } from "@/modules/users";
import { CampaignForm } from "@/modules/campaigns/presentation/components/CampaignForm";
import { createCampaignAction } from "@/modules/campaigns/presentation/controllers/createCampaign.action";
import { filterCampaignsForStaffAccess } from "@/shared/auth/assertCanAccessCampaign";
import { leadHierarchyFilter, managerBookFilter } from "@/shared/auth/applyHierarchyListFilter";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { CreatePanel } from "../_components/CreatePanel";
import { CampaignsTable } from "./_components/CampaignsTable";

export default async function CampaignsPage() {
  const { authContext } = await requirePermission("campaign.view");
  const canManage = hasPermission(authContext, "campaign.manage");
  const isAdmin = authContext.hierarchy.primaryRole === "Admin";
  // Managers may list all org campaigns; lead/call data stays hierarchy-scoped
  // inside each Campaign Dashboard. Admin is already unrestricted.
  const book =
    authContext.hierarchy.primaryRole === "Manager"
      ? {}
      : managerBookFilter(authContext);
  const leadFilter = leadHierarchyFilter(authContext);
  const [rawCampaigns, users, managers] = await Promise.all([
    listCampaigns(authContext.organizationId, book),
    listUsers({ status: "ACTIVE", limit: 5_000 }),
    isAdmin && canManage
      ? listUsersByRole("Manager").then((rows) =>
          rows.filter((user) => user.status === "ACTIVE"),
        )
      : Promise.resolve([]),
  ]);
  const campaigns = await filterCampaignsForStaffAccess(authContext, rawCampaigns);

  const userNameById = new Map(users.map((user) => [user.id, user.fullName]));
  const assignableAgents = users
    .filter((user) => isAssignableAgentRole(user.roleName))
    .map((user) => ({
      id: user.id,
      fullName: user.roleName ? `${user.fullName} (${user.roleName})` : user.fullName,
    }));
  const ownerManagers = managers.map((user) => ({
    id: user.id,
    fullName: user.fullName,
  }));

  const rows = await Promise.all(
    campaigns.map(async (campaign) => {
      const [stats, leadCount, members] = await Promise.all([
        getCampaignStatistics(campaign.id),
        countLeads(authContext.organizationId, {
          campaignId: campaign.id,
          ...leadFilter,
        }),
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
        description="Outbound lead-distribution campaigns, agents, Add from Excel history, and analytics."
        breadcrumbs={[{ label: "Campaigns" }]}
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
                agents={assignableAgents}
                requireOwnerManager={isAdmin}
                ownerManagers={ownerManagers}
              />
            </CreatePanel>
          ) : null
        }
      />
      <CampaignsTable rows={rows} canManage={canManage} />
    </PageSection>
  );
}
