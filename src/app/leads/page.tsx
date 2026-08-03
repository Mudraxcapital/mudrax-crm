import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  getPermissionScope,
  hasPermission,
  hasRole,
  isAssignableAgentRole,
  isCallerWorkspaceUser,
} from "@/modules/rbac";
import {
  countLeads,
  leadCatalogs,
  listActiveLeadFields,
  listLeads,
  listSavedViews,
} from "@/modules/leads";
import { listCampaigns } from "@/modules/campaigns";
import { listUserSummaries, listUsers } from "@/modules/users";
import { AdvancedLeadSearch } from "@/modules/leads/presentation/components/AdvancedLeadSearch";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { managerBookFilter, visibleLeadsFilter } from "@/shared/auth/applyHierarchyListFilter";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";
import { LeadsWorkspace } from "./_components/LeadsWorkspace";

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
  const canHardDelete =
    canUpdate && (hasRole(authContext, "Admin") || hasRole(authContext, "Manager"));

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

  const visibleIds = authContext.hierarchy.visibleUserIds;
  const callersRaw = await listUsers({ status: "ACTIVE", limit: 2_000 })
    .then((users) => users.filter((user) => isAssignableAgentRole(user.roleName)))
    .catch(() =>
      listUserSummaries(authContext.organizationId).then((users) =>
        users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          roleName: "Caller" as string | null,
        })),
      ),
    );
  const callers = visibleIds
    ? callersRaw.filter((user) => visibleIds.includes(user.id))
    : callersRaw;

  let resolvedAssigneeId = assignedToUserId;
  if (!resolvedAssigneeId && callerName) {
    const match = callers.find(
      (user) => user.fullName.toLowerCase() === callerName.toLowerCase(),
    );
    resolvedAssigneeId = match?.id;
  }

  const hierarchyFilter = visibleLeadsFilter(authContext, {
    permissionCode: "lead.view",
    actorUserId: session.user.id,
    assignedToUserId: resolvedAssigneeId,
  });

  const filter = {
    search,
    currentStageId,
    leadSourceId,
    campaignId,
    ...hierarchyFilter,
    fieldFilters: Object.keys(fieldFilters).length > 0 ? fieldFilters : undefined,
    searchableCustomKeys: searchableKeys,
  };

  const [leads, totalLeadCount, sources, stages, lostReasons, assigneesRaw, savedViews, campaigns] =
    await Promise.all([
      listLeads(authContext.organizationId, { ...filter, limit: 10_000 }),
      countLeads(authContext.organizationId, filter),
      leadCatalogs.listSources(authContext.organizationId),
      leadCatalogs.listStages(authContext.organizationId),
      leadCatalogs.listLostReasons(authContext.organizationId),
      listUserSummaries(authContext.organizationId),
      canManageViews ? listSavedViews(session.user.id) : Promise.resolve([]),
      hasPermission(authContext, "campaign.view")
        ? listCampaigns(authContext.organizationId, managerBookFilter(authContext))
        : Promise.resolve([]),
    ]);
  const assignees = visibleIds
    ? assigneesRaw.filter((user) => visibleIds.includes(user.id))
    : assigneesRaw;

  const exportQs = new URLSearchParams();
  if (search) exportQs.set("search", search);
  if (currentStageId) exportQs.set("currentStageId", currentStageId);
  if (leadSourceId) exportQs.set("leadSourceId", leadSourceId);
  if (resolvedAssigneeId) exportQs.set("assignedToUserId", resolvedAssigneeId);
  if (campaignId) exportQs.set("campaignId", campaignId);
  if (priority) exportQs.set("priority", priority);
  for (const [key, value] of Object.entries(fieldFilters)) {
    exportQs.set(`ff_${key}`, value);
  }

  const scope = getPermissionScope(authContext, "lead.view");

  return (
    <PageSection>
      <PageHeader
        title="All Leads"
        description={`${totalLeadCount.toLocaleString()} leads`}
        breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "All Leads" }]}
        actions={
          <>
            {canCreate ? (
              <Link href="/leads/new">
                <Button>Single Lead</Button>
              </Link>
            ) : null}
            {canImport ? (
              <Link href="/leads/import">
                <Button variant="secondary">Add from Excel</Button>
              </Link>
            ) : null}
            <a href={`/api/leads/export?${exportQs.toString()}`}>
              <Button variant="secondary">Export</Button>
            </a>
          </>
        }
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

      <LeadsWorkspace
        rows={leads.map((lead) => ({
          id: lead.id,
          fullNameSnapshot: lead.fullNameSnapshot,
          phoneSnapshot: lead.phoneSnapshot,
          currentStageName: lead.currentStageName,
          assignedAgent: lead.currentAssigneeUserId
            ? (assignees.find((user) => user.id === lead.currentAssigneeUserId)?.fullName ??
              "Unknown")
            : "Unassigned",
          lastCallAt: null,
          nextActionAt: lead.nextActionAt,
          priority: lead.fieldValues?.find((v) => v.internalKey === "priority")?.displayValue ?? "—",
          leadSourceName: lead.leadSourceName,
        }))}
        canReassign={canReassign}
        canUpdate={canUpdate}
        canHardDelete={canHardDelete}
        stages={excludeTestCatalogRows(stages).map((stage) => ({
          id: stage.id,
          name: stage.name,
          bucket: stage.bucket,
          closeOutcome: stage.closeOutcome,
        }))}
        lostReasons={excludeTestCatalogRows(lostReasons)}
        assignees={assignees.map((user) => ({
          id: user.id,
          fullName: user.fullName,
        }))}
      />
    </PageSection>
  );
}
