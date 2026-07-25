import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { getKanbanBoard, leadCatalogs } from "@/modules/leads";
import { LeadKanbanBoard } from "@/modules/leads/presentation/components/LeadKanbanBoard";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { TabNav } from "@/shared/ui/Tabs";

export default async function LeadPipelinePage() {
  const { session, authContext } = await requirePermission("lead.view");
  const canImport = hasPermission(authContext, "lead.import");
  const scope = getPermissionScope(authContext, "lead.view");
  const filter = scope === "SELF" ? { assignedToUserIds: [session.user.id] } : undefined;

  const [columns, lostReasons] = await Promise.all([
    getKanbanBoard(authContext.organizationId, filter),
    leadCatalogs.listLostReasons(authContext.organizationId),
  ]);

  return (
    <PageSection>
      <PageHeader
        title="Lead Pipeline"
        description="Kanban board of lead stages. Drag a card to update status (audited)."
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
      <LeadKanbanBoard columns={columns} lostReasons={lostReasons} />
    </PageSection>
  );
}
