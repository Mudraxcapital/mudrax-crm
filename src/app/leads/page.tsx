import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope, hasPermission } from "@/modules/rbac";
import { listCustomers } from "@/modules/customers";
import { leadCatalogs, listLeads, listSavedViews } from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { LeadForm } from "@/modules/leads/presentation/components/LeadForm";
import { createLeadAction } from "@/modules/leads/presentation/controllers/createLead.action";
import { AdvancedLeadSearch } from "@/modules/leads/presentation/components/AdvancedLeadSearch";
import { BulkLeadActions } from "@/modules/leads/presentation/components/BulkLeadActions";
import { MergeLeadsForm } from "@/modules/leads/presentation/components/MergeLeadsForm";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { TabNav } from "@/shared/ui/Tabs";
import { CreatePanel } from "../_components/CreatePanel";
import { LeadsTable } from "./_components/LeadsTable";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requirePermission("lead.view");
  const canCreate = hasPermission(authContext, "lead.create");
  const canImport = hasPermission(authContext, "lead.import");
  const canManageViews = hasPermission(authContext, "saved_view.manage");
  const canReassign = hasPermission(authContext, "lead.reassign");
  const canUpdate = hasPermission(authContext, "lead.update");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const currentStageId =
    typeof params.currentStageId === "string" ? params.currentStageId : undefined;
  const leadSourceId = typeof params.leadSourceId === "string" ? params.leadSourceId : undefined;
  const assignedToUserId =
    typeof params.assignedToUserId === "string" ? params.assignedToUserId : undefined;

  const scope = getPermissionScope(authContext, "lead.view");
  const filter = {
    search,
    currentStageId,
    leadSourceId,
    assignedToUserIds:
      scope === "SELF"
        ? [session.user.id]
        : assignedToUserId
          ? [assignedToUserId]
          : undefined,
  };

  const [leads, customers, sources, stages, lostReasons, assignees, savedViews] =
    await Promise.all([
      listLeads(authContext.organizationId, filter),
      listCustomers(authContext.organizationId),
      leadCatalogs.listSources(authContext.organizationId),
      leadCatalogs.listStages(authContext.organizationId),
      leadCatalogs.listLostReasons(authContext.organizationId),
      listUserSummaries(authContext.organizationId),
      canManageViews ? listSavedViews(session.user.id) : Promise.resolve([]),
    ]);

  const exportQs = new URLSearchParams();
  if (search) exportQs.set("search", search);
  if (currentStageId) exportQs.set("currentStageId", currentStageId);
  if (leadSourceId) exportQs.set("leadSourceId", leadSourceId);
  if (assignedToUserId) exportQs.set("assignedToUserId", assignedToUserId);

  return (
    <PageSection>
      <PageHeader
        title="Leads"
        description="Inbound sales inquiries tracked through your pipeline."
        breadcrumbs={[{ label: "Sales", href: "/crm" }, { label: "Leads" }]}
        actions={
          <>
            <Link href="/leads/pipeline">
              <Button variant="secondary">Pipeline</Button>
            </Link>
            {canImport ? (
              <Link href="/leads/import">
                <Button variant="secondary">Import</Button>
              </Link>
            ) : null}
            <a href={`/api/leads/export?${exportQs.toString()}`}>
              <Button variant="secondary">Export</Button>
            </a>
            {canCreate ? (
              <CreatePanel
                triggerLabel="New lead"
                title="Create lead"
                description="Link an inquiry to a customer and assign ownership."
                width="lg"
              >
                <LeadForm
                  action={createLeadAction}
                  customers={customers.map((customer) => ({
                    id: customer.id,
                    fullName: customer.fullName,
                  }))}
                  sources={sources}
                  assignees={assignees.map((user) => ({ id: user.id, fullName: user.fullName }))}
                />
              </CreatePanel>
            ) : null}
          </>
        }
      />

      <TabNav
        activeHref="/leads"
        items={[
          { href: "/leads", label: "List" },
          { href: "/leads/pipeline", label: "Pipeline" },
          ...(canImport ? [{ href: "/leads/import", label: "Import" }] : []),
        ]}
      />

      <AdvancedLeadSearch
        stages={stages}
        sources={sources}
        savedViews={savedViews}
        current={{ search, currentStageId, leadSourceId, assignedToUserId }}
      />

      <LeadsTable
        rows={leads.map((lead) => ({
          id: lead.id,
          fullNameSnapshot: lead.fullNameSnapshot,
          currentStageName: lead.currentStageName,
          leadSourceName: lead.leadSourceName,
        }))}
      />

      {canReassign || canUpdate ? (
        <Card>
          <CardHeader
            title="Bulk actions"
            description="Apply stage or assignment changes across the current result set."
          />
          <CardBody>
            <BulkLeadActions
              leadIds={leads.map((lead) => lead.id)}
              stages={stages}
              lostReasons={lostReasons}
              assignees={assignees.map((user) => ({ id: user.id, fullName: user.fullName }))}
            />
          </CardBody>
        </Card>
      ) : null}

      {canUpdate ? (
        <Card>
          <CardHeader
            title="Merge leads"
            description="Close a duplicate as Lost while keeping the survivor (same customer required)."
          />
          <CardBody>
            <MergeLeadsForm lostReasons={lostReasons} />
          </CardBody>
        </Card>
      ) : null}
    </PageSection>
  );
}
