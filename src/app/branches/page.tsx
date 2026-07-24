import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listBranches } from "@/modules/organization";
import { BranchForm } from "@/modules/organization/presentation/components/BranchForm";
import { createBranchAction } from "@/modules/organization/presentation/controllers/createBranch.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { TabNav } from "@/shared/ui/Tabs";
import { CreatePanel } from "../_components/CreatePanel";
import { BranchesTable } from "./_components/BranchesTable";

export default async function BranchesPage() {
  const { authContext } = await requirePermission("organization.view");
  const canManage = hasPermission(authContext, "branch.manage");
  const branches = await listBranches(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Branches"
        description="Physical or operational offices of the organization."
        actions={
          canManage ? (
            <CreatePanel
              triggerLabel="New branch"
              title="Create branch"
              description="Add an office with code and timezone."
              width="lg"
            >
              <BranchForm action={createBranchAction} submitLabel="Create Branch" />
            </CreatePanel>
          ) : null
        }
      />
      <TabNav
        activeHref="/branches"
        items={[
          { href: "/organizations", label: "Organizations" },
          { href: "/branches", label: "Branches" },
          { href: "/departments", label: "Departments" },
          { href: "/teams", label: "Teams" },
        ]}
      />
      <BranchesTable
        canManage={canManage}
        rows={branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          timezone: branch.timezone,
          status: branch.isArchived ? "Archived" : "Active",
        }))}
      />
    </PageSection>
  );
}
