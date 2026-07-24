import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listOrganizations } from "@/modules/organization";
import { OrganizationForm } from "@/modules/organization/presentation/components/OrganizationForm";
import { createOrganizationAction } from "@/modules/organization/presentation/controllers/createOrganization.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { TabNav } from "@/shared/ui/Tabs";
import { CreatePanel } from "../_components/CreatePanel";
import { OrganizationsTable } from "./_components/OrganizationsTable";

export default async function OrganizationsPage() {
  const { authContext } = await requirePermission("organization.view");
  const canManage = hasPermission(authContext, "organization.manage");
  const organizations = await listOrganizations();

  return (
    <PageSection>
      <PageHeader
        title="Organizations"
        description="Canonical company scope for every record in the system."
        actions={
          <>
            <Link href="/branches">
              <Button variant="secondary">Branches</Button>
            </Link>
            {canManage ? (
              <CreatePanel
                triggerLabel="New organization"
                title="Create organization"
                description="Define the company unit and timezone."
                width="lg"
              >
                <OrganizationForm
                  action={createOrganizationAction}
                  submitLabel="Create Organization"
                />
              </CreatePanel>
            ) : null}
          </>
        }
      />

      <TabNav
        activeHref="/organizations"
        items={[
          { href: "/organizations", label: "Organizations" },
          { href: "/branches", label: "Branches" },
          { href: "/departments", label: "Departments" },
          { href: "/teams", label: "Teams" },
        ]}
      />

      <OrganizationsTable
        canManage={canManage}
        rows={organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          code: organization.code,
          status: organization.status,
          timezone: organization.timezone,
        }))}
      />
    </PageSection>
  );
}
