import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope } from "@/modules/rbac";
import { getKanbanBoard, leadCatalogs } from "@/modules/leads";
import { LeadKanbanBoard } from "@/modules/leads/presentation/components/LeadKanbanBoard";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { TabNav } from "@/shared/ui/Tabs";

export default async function LeadPipelinePage() {
  const { session, authContext } = await requirePermission("lead.view");
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
        breadcrumbs={[{ label: "Sales", href: "/crm" }, { label: "Pipeline" }]}
      />
      <TabNav
        activeHref="/leads/pipeline"
        items={[
          { href: "/leads", label: "List" },
          { href: "/leads/pipeline", label: "Pipeline" },
        ]}
      />
      <LeadKanbanBoard columns={columns} lostReasons={lostReasons} />
    </PageSection>
  );
}
