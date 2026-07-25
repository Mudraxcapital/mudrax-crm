import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCampaigns, listCampaignMembers, getCampaignStatistics } from "@/modules/campaigns";
import {
  leadCatalogs,
  listActiveLeadFields,
  listImportBatches,
  listLeads,
  countLeads,
} from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { LeadImportForm } from "@/modules/leads/presentation/components/LeadImportForm";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { TabNav } from "@/shared/ui/Tabs";
import { leadHierarchyFilter, managerBookFilter } from "@/shared/auth/applyHierarchyListFilter";

export default async function LeadImportPage() {
  const { authContext } = await requirePermission("lead.import");
  const canCreateCampaign = hasPermission(authContext, "campaign.manage");
  const canViewLeads = hasPermission(authContext, "lead.view");
  const book = managerBookFilter(authContext);
  const hierarchyFilter = leadHierarchyFilter(authContext);

  const [sources, batches, campaigns, users, allLeads, activeFields] = await Promise.all([
    leadCatalogs.listSources(authContext.organizationId),
    listImportBatches(authContext.organizationId, book),
    listCampaigns(authContext.organizationId, book),
    listUserSummaries(authContext.organizationId),
    listLeads(authContext.organizationId, { limit: 5000, ...hierarchyFilter }),
    listActiveLeadFields(authContext.organizationId),
  ]);
  const importableFields = activeFields.filter((field) => field.isImportable);

  const campaignOptions = await Promise.all(
    campaigns.map(async (campaign) => {
      const [members, stats, leadCount] = await Promise.all([
        listCampaignMembers(campaign.id),
        getCampaignStatistics(campaign.id),
        countLeads(authContext.organizationId, { campaignId: campaign.id }),
      ]);
      const activeMembers = members.filter((member) => member.isActive);
      const agentNames = activeMembers.map(
        (member) => users.find((user) => user.id === member.userId)?.fullName ?? member.userId,
      );
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        leadCount,
        agentCount: stats.activeMemberCount,
        agentNames,
      };
    }),
  );

  const visibleIds = authContext.hierarchy.visibleUserIds;
  const agents = users
    .filter((user) => user.status === "ACTIVE")
    .filter((user) => !visibleIds || visibleIds.includes(user.id))
    .map((user) => {
      const assigned = allLeads.filter((lead) => lead.currentAssigneeUserId === user.id);
      const openLeads = assigned.filter((lead) => lead.currentStageBucket !== "CLOSED").length;
      const completedLeads = assigned.filter((lead) => lead.currentStageBucket === "CLOSED").length;
      return {
        id: user.id,
        fullName: user.fullName,
        openLeads,
        completedLeads,
        availability: "AVAILABLE" as const,
      };
    });

  const userNameById = new Map(users.map((user) => [user.id, user.fullName]));
  const campaignNameById = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));

  return (
    <PageSection>
      <PageHeader
        title="Add Leads from Excel"
        description="Add from Excel Wizard — upload, map fields, resolve duplicates, assign campaign & agents, then distribute."
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Add from Excel" },
        ]}
      />

      <TabNav
        activeHref="/leads/import"
        items={[
          ...(canViewLeads
            ? [
                { href: "/leads", label: "All Leads" },
                { href: "/leads/pipeline", label: "Pipeline" },
              ]
            : []),
          { href: "/leads/import", label: "Add from Excel" },
        ]}
      />

      <section className="mx-card p-5">
        <LeadImportForm
          sources={sources}
          campaigns={campaignOptions}
          agents={agents}
          canCreateCampaign={canCreateCampaign}
          importableFields={importableFields}
        />
      </section>

      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Add from Excel History</h2>
        </div>
        <div className="mx-scroll overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs">
              <tr>
                <th className="px-4 py-2">File Name</th>
                <th className="px-4 py-2">Uploaded By</th>
                <th className="px-4 py-2">Upload Date</th>
                <th className="px-4 py-2">Campaign</th>
                <th className="px-4 py-2">Rows Added</th>
                <th className="px-4 py-2">Rows Failed</th>
                <th className="px-4 py-2">Duplicates</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted px-4 py-6 text-center">
                    Nothing added from Excel yet.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const failed = Math.max(
                    0,
                    batch.totalRowCount - batch.createdRowCount - batch.duplicateRowCount,
                  );
                  return (
                    <tr key={batch.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{batch.sourceFileName}</td>
                      <td className="px-4 py-2">
                        {userNameById.get(batch.uploadedByUserId) ?? batch.uploadedByUserId}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(batch.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {batch.campaignId
                          ? (campaignNameById.get(batch.campaignId) ?? batch.campaignId)
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{batch.createdRowCount}</td>
                      <td className="px-4 py-2">{failed}</td>
                      <td className="px-4 py-2">{batch.duplicateRowCount}</td>
                      <td className="px-4 py-2">{batch.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Link href="/leads" className="text-sm text-accent hover:underline underline-offset-4">
        ← All Leads
      </Link>
    </PageSection>
  );
}
