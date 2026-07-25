import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listDepartments } from "@/modules/organization";
import { DepartmentForm } from "@/modules/organization/presentation/components/DepartmentForm";
import { createDepartmentAction } from "@/modules/organization/presentation/controllers/createDepartment.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { TabNav } from "@/shared/ui/Tabs";
import { CreatePanel } from "../_components/CreatePanel";
import { SimpleEntityTable } from "../_components/SimpleEntityTable";

export default async function DepartmentsPage() {
  const { authContext } = await requirePermission("organization.view");
  const canManage = hasPermission(authContext, "department.manage");
  const departments = await listDepartments(authContext.organizationId);

  return (
    <PageSection>
      <PageHeader
        title="Departments"
        description="Functional groupings such as Sales, Operations, Recovery, or HR."
        actions={
          canManage ? (
            <CreatePanel
              triggerLabel="New department"
              title="Create department"
              width="md"
            >
              <DepartmentForm action={createDepartmentAction} submitLabel="Create Department" />
            </CreatePanel>
          ) : null
        }
      />
      <TabNav
        activeHref="/departments"
        items={[
          { href: "/organizations", label: "Organizations" },
          { href: "/branches", label: "Branches" },
          { href: "/departments", label: "Departments" },
          { href: "/teams", label: "Teams" },
        ]}
      />
      <SimpleEntityTable
        searchPlaceholder="Search departments…"
        emptyTitle="No departments yet"
        editHrefPrefix={canManage ? "/departments" : undefined}
        rows={departments.map((department) => ({
          id: department.id,
          name: department.name,
          code: department.code,
          status: department.isArchived ? "Archived" : "Active",
        }))}
      />
    </PageSection>
  );
}
