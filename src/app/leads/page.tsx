import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope, hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { listCustomers } from "@/modules/customers";
import {
  countLeads,
  leadCatalogs,
  listActiveLeadFields,
  listLeads,
  listSavedViews,
} from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { listUserSummaries, listUsers } from "@/modules/users";
import { LeadForm } from "@/modules/leads/presentation/components/LeadForm";
import { createLeadAction } from "@/modules/leads/presentation/controllers/createLead.action";
import { AdvancedLeadSearch } from "@/modules/leads/presentation/components/AdvancedLeadSearch";
import { BulkLeadActions } from "@/modules/leads/presentation/components/BulkLeadActions";
import { MergeLeadsForm } from "@/modules/leads/presentation/components/MergeLeadsForm";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { TabNav } from "@/shared/ui/Tabs";
import { leadHierarchyFilter, managerBookFilter } from "@/shared/auth/applyHierarchyListFilter";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";
import { CreatePanel } from "../_components/CreatePanel";
import { LeadsTable } from "./_components/LeadsTable";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requirePermission("lead.view");
  if (isCallerWorkspaceUser(authContext)) {
    redirect("/caller/leads");
  }

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
  const campaignId = typeof params.campaignId === "string" ? params.campaignId : undefined;
  const callerName = typeof params.callerName === "string" ? params.callerName.trim() : undefined;
  const priority = typeof params.priority === "string" ? params.priority : undefined;

  const activeFields = await listActiveLeadFields(authContext.organizationId);
  const searchableKeys = activeFields
    .filter((field) => field.isSearchable)
    .map((field) => field.internalKey)
    .filter((key) => key !== "full_name" && key !== "phone" && key !== "email");

  const fieldFilters: Record<string, string> = {};
  for (const field of activeFields.filter((item) => item.isFilterable)) {
    const raw = params[`ff_${field.internalKey}`];
    if (typeof raw === "string" && raw.trim()) {
      fieldFilters[field.internalKey] = raw.trim();
    }
  }
  if (priority && !fieldFilters.priority) {
    fieldFilters.priority = priority;
  }

  const callers = await listUsers({ role: "Caller", status: "ACTIVE", limit: 2_000 }).catch(() =>
    listUserSummaries(authContext.organizationId).then((users) =>
      users.map((user) => ({ id: user.id, fullName: user.fullName, roleName: "Caller" as string | null })),
    ),
  );

  let resolvedAssigneeId = assignedToUserId;
  if (!resolvedAssigneeId && callerName) {
    const match = callers.find(
      (user) => user.fullName.toLowerCase() === callerName.toLowerCase(),
    );
    resolvedAssigneeId = match?.id;
  }

  const scope = getPermissionScope(authContext, "lead.view");
  const hierarchyFilter = leadHierarchyFilter(authContext);
  const filter = {
    search,
    currentStageId,
    leadSourceId,
    campaignId,
    ownerManagerId: hierarchyFilter.ownerManagerId,
    ownerTeamLeadId: hierarchyFilter.ownerTeamLeadId,
    assignedToUserIds:
      scope === "SELF" || hierarchyFilter.assignedToUserIds
        ? (hierarchyFilter.assignedToUserIds ?? [session.user.id])
        : resolvedAssigneeId
          ? [resolvedAssigneeId]
          : undefined,
    fieldFilters: Object.keys(fieldFilters).length > 0 ? fieldFilters : undefined,
    searchableCustomKeys: searchableKeys,
  };

  const [
    leads,
    totalLeadCount,
    customers,
    sources,
    stages,
    lostReasons,
    assignees,
    savedViews,
    campaigns,
  ] = await Promise.all([
    listLeads(authContext.organizationId, { ...filter, limit: 10_000 }),
    countLeads(authContext.organizationId, filter),
    listCustomers(authContext.organizationId, {
      limit: 10_000,
      ...managerBookFilter(authContext),
    }),
    leadCatalogs.listSources(authContext.organizationId),
    leadCatalogs.listStages(authContext.organizationId),
    leadCatalogs.listLostReasons(authContext.organizationId),
    listUserSummaries(authContext.organizationId),
    canManageViews ? listSavedViews(session.user.id) : Promise.resolve([]),
    hasPermission(authContext, "campaign.view")
      ? listCampaigns(authContext.organizationId, managerBookFilter(authContext))
      : Promise.resolve([]),
  ]);

  const exportQs = new URLSearchParams();
  if (search) exportQs.set("search", search);
  if (currentStageId) exportQs.set("currentStageId", currentStageId);
  if (leadSourceId) exportQs.set("leadSourceId", leadSourceId);
  if (resolvedAssigneeId) exportQs.set("assignedToUserId", resolvedAssigneeId);
  if (campaignId) exportQs.set("campaignId", campaignId);

  return (
    <PageSection>
      <PageHeader
        title="All Leads"
        description={`Inbound sales inquiries tracked through your pipeline. ${totalLeadCount.toLocaleString()} total.`}
        breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "All Leads" }]}
        actions={
          <>
            <Link href="/leads/pipeline">
              <Button variant="secondary">Pipeline</Button>
            </Link>
            {canImport ? (
              <Link href="/leads/import">
                <Button variant="secondary">Add from Excel</Button>
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
                  fields={activeFields}
                />
              </CreatePanel>
            ) : null}
          </>
        }
      />

      <TabNav
        activeHref="/leads"
        items={[
          { href: "/leads", label: "All Leads" },
          { href: "/leads/pipeline", label: "Pipeline" },
          ...(canImport ? [{ href: "/leads/import", label: "Add from Excel" }] : []),
        ]}
      />

      <AdvancedLeadSearch
        stages={excludeTestCatalogRows(stages)}
        sources={excludeTestCatalogRows(sources)}
        campaigns={excludeTestCatalogRows(
          campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name })),
        )}
        callers={callers.map((user) => ({ id: user.id, fullName: user.fullName }))}
        savedViews={savedViews}
        filterableFields={activeFields.filter((field) => field.isFilterable)}
        showCallerFilter={scope !== "SELF"}
        current={{
          search,
          currentStageId,
          leadSourceId,
          assignedToUserId: resolvedAssigneeId,
          campaignId,
          priority,
          fieldFilters,
        }}
      />

      <LeadsTable
        rows={leads.map((lead) => ({
          id: lead.id,
          fullNameSnapshot: lead.fullNameSnapshot,
          phoneSnapshot: lead.phoneSnapshot,
          currentStageName: lead.currentStageName,
          assignedAgent: lead.currentAssigneeUserId
            ? (assignees.find((user) => user.id === lead.currentAssigneeUserId)?.fullName ??
              lead.currentAssigneeUserId)
            : "Unassigned",
          lastCallAt: null,
          nextActionAt: lead.nextActionAt,
          priority: "—",
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
