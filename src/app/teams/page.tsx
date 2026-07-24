import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listTeams, listBranches } from "@/modules/organization";
import { TeamForm } from "@/modules/organization/presentation/components/TeamForm";
import { createTeamAction } from "@/modules/organization/presentation/controllers/createTeam.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { TabNav } from "@/shared/ui/Tabs";
import { CreatePanel } from "../_components/CreatePanel";
import { SimpleEntityTable } from "../_components/SimpleEntityTable";

export default async function TeamsPage() {
  const { authContext } = await requirePermission("organization.view");
  const canManage = hasPermission(authContext, "team.manage");

  const [teams, branches] = await Promise.all([
    listTeams(authContext.organizationId),
    listBranches(authContext.organizationId),
  ]);
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));

  return (
    <PageSection>
      <PageHeader
        title="Teams"
        description="Operational groupings of users for supervision, allocation, and reporting."
        actions={
          canManage ? (
            <CreatePanel triggerLabel="New team" title="Create team" width="lg">
              <TeamForm
                action={createTeamAction}
                submitLabel="Create Team"
                branches={branches}
              />
            </CreatePanel>
          ) : null
        }
      />
      <TabNav
        activeHref="/teams"
        items={[
          { href: "/organizations", label: "Organizations" },
          { href: "/branches", label: "Branches" },
          { href: "/departments", label: "Departments" },
          { href: "/teams", label: "Teams" },
        ]}
      />
      <SimpleEntityTable
        searchPlaceholder="Search teams…"
        emptyTitle="No teams yet"
        onOpenHref={canManage ? (id) => `/teams/${id}/edit` : undefined}
        rows={teams.map((team) => ({
          id: team.id,
          name: team.name,
          code: team.code,
          meta: team.branchId ? (branchNameById.get(team.branchId) ?? "—") : "—",
          status: team.isArchived ? "Archived" : "Active",
        }))}
      />
    </PageSection>
  );
}
