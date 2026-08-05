import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { canViewUserId, hasPermission, isAssignableAgentRole } from "@/modules/rbac";
import {
  CampaignNotFoundError,
  getCampaign,
  getCampaignStatistics,
  isDoNotDisturbCampaignName,
  listCampaignAuditLog,
  listCampaignMembers,
} from "@/modules/campaigns";
import {
  countLeads,
  listActiveLeadFields,
  listImportBatches,
  listLatestLeadNoteBodies,
  listLeads,
  revertExpiredTemporaryAssignments,
} from "@/modules/leads";
import { listUsers } from "@/modules/users";
import { CampaignStatusForm } from "@/modules/campaigns/presentation/components/CampaignStatusForm";
import { AddCampaignMemberForm } from "@/modules/campaigns/presentation/components/AddCampaignMemberForm";
import { AssignCampaignLeadsForm } from "@/modules/campaigns/presentation/components/AssignCampaignLeadsForm";
import { TemporaryCampaignReassignForm } from "@/modules/campaigns/presentation/components/TemporaryCampaignReassignForm";
import { changeCampaignStatusAction } from "@/modules/campaigns/presentation/controllers/changeCampaignStatus.action";
import { addCampaignMemberAction } from "@/modules/campaigns/presentation/controllers/addCampaignMember.action";
import { removeCampaignMemberAction } from "@/modules/campaigns/presentation/controllers/removeCampaignMember.action";
import { assignCampaignLeadsAction } from "@/modules/campaigns/presentation/controllers/assignCampaignLeads.action";
import {
  endTemporaryCampaignReassignAction,
  temporaryCampaignReassignAction,
} from "@/modules/campaigns/presentation/controllers/temporaryCampaignReassign.action";
import { Badge } from "@/shared/ui/Badge";
import {
  assertCanAccessCampaignAsStaff,
  CampaignAccessDeniedError,
} from "@/shared/auth/assertCanAccessCampaign";
import { leadHierarchyFilter } from "@/shared/auth/applyHierarchyListFilter";
import { TabNav } from "@/shared/ui/Tabs";
import { EmployeeLink } from "@/shared/ui/EmployeeLink";
import { nameFromMap } from "@/shared/ui/displayName";
import { CampaignLeadsTable } from "../_components/CampaignLeadsTable";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { authContext } = await requirePermission("campaign.view");
  const { id } = await params;
  const query = await searchParams;
  const tab = typeof query.tab === "string" ? query.tab : "overview";

  let campaign;
  try {
    campaign = await getCampaign(id);
    await assertCanAccessCampaignAsStaff(authContext, campaign);
  } catch (error) {
    if (error instanceof CampaignNotFoundError || error instanceof CampaignAccessDeniedError) {
      notFound();
    }
    throw error;
  }

  const fieldFilterParams: Record<string, string> = {};
  const activeFields = await listActiveLeadFields(authContext.organizationId);
  for (const field of activeFields.filter((item) => item.isFilterable)) {
    const raw = query[`ff_${field.internalKey}`];
    if (typeof raw === "string" && raw.trim()) {
      fieldFilterParams[field.internalKey] = raw.trim();
    }
  }
  const employeeId =
    typeof query.employeeId === "string" && query.employeeId.trim()
      ? query.employeeId.trim()
      : undefined;

  // Hierarchy-scoped lead visibility (Team Lead must not see sibling-team leads).
  const hierarchyLead = leadHierarchyFilter(authContext);
  const safeEmployeeId =
    employeeId && canViewUserId(authContext.hierarchy, employeeId) ? employeeId : undefined;

  // Auto-revert expired holiday covers so leads return without waiting on the jobs worker.
  await revertExpiredTemporaryAssignments({
    organizationId: authContext.organizationId,
    actor: { actorType: "SYSTEM", actorId: null },
  }).catch(() => undefined);

  const canManage = hasPermission(authContext, "campaign.manage");
  const canAssign = hasPermission(authContext, "campaign.assign");
  const canImport = hasPermission(authContext, "lead.import");
  const canSetTemporaryCaller =
    canAssign &&
    (authContext.hierarchy.primaryRole === "Admin" ||
      authContext.hierarchy.primaryRole === "Manager");
  const isDndCampaign = isDoNotDisturbCampaignName(campaign.name);

  const LEAD_PAGE_SIZE = 100;
  const rawLeadPage = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
  const leadPage = Number.isFinite(rawLeadPage) && rawLeadPage > 0 ? rawLeadPage : 1;
  const leadOffset = (leadPage - 1) * LEAD_PAGE_SIZE;

  const leadListFilter = {
    campaignId: id,
    ...hierarchyLead,
    assignedToUserIds: safeEmployeeId
      ? [safeEmployeeId]
      : hierarchyLead.assignedToUserIds,
    fieldFilters: Object.keys(fieldFilterParams).length > 0 ? fieldFilterParams : undefined,
    searchableCustomKeys: activeFields
      .filter((field) => field.isSearchable)
      .map((field) => field.internalKey)
      .filter((key) => !["full_name", "phone", "email"].includes(key)),
    search: typeof query.search === "string" ? query.search : undefined,
  };

  const needsLeadTable = tab === "leads";
  const needsAssigneeRoster = tab === "overview" || tab === "agents" || canSetTemporaryCaller;

  const [members, statistics, auditLog, users, leads, filteredLeadCount, totalLeadCount, importBatches, rosterLeads] =
    await Promise.all([
      listCampaignMembers(id),
      getCampaignStatistics(id),
      listCampaignAuditLog(id),
      listUsers({ status: "ACTIVE", limit: 5_000 }),
      needsLeadTable
        ? listLeads(authContext.organizationId, {
            ...leadListFilter,
            limit: LEAD_PAGE_SIZE,
            offset: leadOffset,
          })
        : Promise.resolve([]),
      needsLeadTable
        ? countLeads(authContext.organizationId, leadListFilter)
        : Promise.resolve(0),
      countLeads(authContext.organizationId, {
        campaignId: id,
        ...hierarchyLead,
      }),
      listImportBatches(authContext.organizationId, { campaignId: id }),
      // Bounded roster for distribution / temp-cover pickers (not the full lead table).
      needsAssigneeRoster
        ? listLeads(authContext.organizationId, {
            campaignId: id,
            ...hierarchyLead,
            limit: 2_000,
          })
        : Promise.resolve([]),
    ]);

  const latestNoteByLeadId =
    isDndCampaign && needsLeadTable && leads.length > 0
      ? await listLatestLeadNoteBodies(leads.map((lead) => lead.id)).catch(
          () => new Map<string, string | null>(),
        )
      : new Map<string, string | null>();

  const userNameById = new Map(users.map((user) => [user.id, user.fullName]));
  const activeMembers = members.filter((member) => member.isActive);
  // Team Lead assign UI only lists agents in hierarchy.
  const scopedActiveMembers = activeMembers.filter((member) =>
    canViewUserId(authContext.hierarchy, member.userId),
  );
  const assignableMembers =
    authContext.hierarchy.primaryRole === "Team Lead" ? scopedActiveMembers : activeMembers;
  const memberCandidates = users.filter(
    (user) =>
      isAssignableAgentRole(user.roleName) &&
      canViewUserId(authContext.hierarchy, user.id) &&
      !activeMembers.some((member) => member.userId === user.id),
  );
  /** Any assignable agent in the org (hierarchy-scoped) — temporary cover target. */
  const orgAgentsForTemp = users.filter(
    (user) =>
      isAssignableAgentRole(user.roleName) && canViewUserId(authContext.hierarchy, user.id),
  );
  const boundChangeStatus = changeCampaignStatusAction.bind(null, id);
  const boundAddMember = addCampaignMemberAction.bind(null, id);
  const boundAssignLeads = assignCampaignLeadsAction.bind(
    null,
    id,
    assignableMembers.map((member) => member.userId),
  );
  const boundTemporaryReassign = temporaryCampaignReassignAction.bind(null, id);
  const boundEndTemporaryReassign = endTemporaryCampaignReassignAction.bind(null, id);

  const tempAssigneeUserIds = new Set(
    rosterLeads
      .filter((lead) => lead.isTemporaryAssignee && lead.currentAssigneeUserId)
      .map((lead) => lead.currentAssigneeUserId!),
  );

  // On-leave picker: campaign agents + anyone who currently owns campaign leads.
  const fromCallerIds = new Set<string>(assignableMembers.map((member) => member.userId));
  for (const lead of rosterLeads) {
    if (lead.currentStageBucket === "CLOSED") continue;
    if (lead.permanentAssigneeUserId) fromCallerIds.add(lead.permanentAssigneeUserId);
    else if (lead.currentAssigneeUserId) fromCallerIds.add(lead.currentAssigneeUserId);
  }
  const fromCallersForTemp = [...fromCallerIds]
    .filter((userId) => canViewUserId(authContext.hierarchy, userId))
    .map((userId) => ({
      userId,
      fullName: nameFromMap(userNameById, userId),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const sourceFromDescription =
    campaign.description
      ?.split("\n")
      .find((line) => line.toLowerCase().startsWith("source:"))
      ?.replace(/^source:\s*/i, "") ?? "—";

  const tabs = [
    { href: `/campaigns/${id}?tab=overview`, label: "Overview" },
    { href: `/campaigns/${id}?tab=agents`, label: "Assigned Agents" },
    { href: `/campaigns/${id}?tab=leads`, label: "Lead List" },
    { href: `/campaigns/${id}?tab=imports`, label: "Add from Excel History" },
    { href: `/campaigns/${id}?tab=analytics`, label: "Analytics" },
  ];

  const distribution = assignableMembers.map((member) => {
    const count = rosterLeads.filter((lead) => lead.currentAssigneeUserId === member.userId).length;
    return {
      userId: member.userId,
      name: nameFromMap(userNameById, member.userId),
      count,
    };
  });
  const leadTotalPages = Math.max(1, Math.ceil(filteredLeadCount / LEAD_PAGE_SIZE));

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/campaigns" className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Campaigns
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-muted mt-1 text-sm">
            {campaign.status} · Source {sourceFromDescription} · Created by{" "}
            {nameFromMap(userNameById, campaign.createdByUserId)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/leads/pipeline?campaignId=${id}`}
            className="text-sm text-accent hover:underline underline-offset-4"
          >
            Open Pipeline
          </Link>
          {canImport ? (
            <Link
              href="/leads/import"
              className="text-sm text-accent hover:underline underline-offset-4"
            >
              Add Leads from Excel
            </Link>
          ) : null}
          {canManage ? (
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className="text-sm text-accent hover:underline underline-offset-4"
            >
              Edit
            </Link>
          ) : null}
        </div>
      </div>

      <TabNav activeHref={`/campaigns/${id}?tab=${tab}`} items={tabs} />

      {tab === "overview" || !["agents", "leads", "imports", "analytics"].includes(tab) ? (
        <>
          <section className="mx-card p-5">
            <h2 className="text-sm font-medium">Campaign Details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm lg:grid-cols-4">
              <dt className="text-muted">Status</dt>
              <dd>{campaign.status}</dd>
              <dt className="text-muted">Source</dt>
              <dd>{sourceFromDescription}</dd>
              <dt className="text-muted">Total Leads</dt>
              <dd>{totalLeadCount}</dd>
              <dt className="text-muted">Assigned Agents</dt>
              <dd>{activeMembers.length}</dd>
              <dt className="text-muted">Created By</dt>
              <dd>{userNameById.get(campaign.createdByUserId) ?? "—"}</dd>
              <dt className="text-muted">Window</dt>
              <dd>
                {campaign.startDate ?? "—"} → {campaign.endDate ?? "—"}
              </dd>
            </dl>
            {campaign.description ? (
              <p className="text-foreground/80 mt-4 whitespace-pre-wrap text-sm">
                {campaign.description}
              </p>
            ) : null}
          </section>

          <section className="mx-card p-5">
            <h2 className="text-sm font-medium">Lead Distribution</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {distribution.length === 0 ? (
                <li className="text-muted">No agents assigned yet.</li>
              ) : (
                distribution.map((item) => (
                  <li key={item.userId} className="flex justify-between border-b border-border pb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <EmployeeLink userId={item.userId} name={item.name} campaignId={id} />
                      {tempAssigneeUserIds.has(item.userId) ? (
                        <Badge tone="warning" className="uppercase tracking-wide">
                          temp
                        </Badge>
                      ) : null}
                    </span>
                    <span className="font-medium">{item.count} leads</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          {canManage ? (
            <section className="mx-card p-5">
              <h2 className="text-sm font-medium">Status</h2>
              <div className="mt-4">
                <CampaignStatusForm action={boundChangeStatus} currentStatus={campaign.status} />
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {tab === "agents" ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Assigned Agents</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {activeMembers.length === 0 ? (
              <li className="text-muted">No active members yet.</li>
            ) : (
              activeMembers.map((member) => (
                <li key={member.userId} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <EmployeeLink
                      userId={member.userId}
                      name={nameFromMap(userNameById, member.userId)}
                      campaignId={id}
                    />
                    {tempAssigneeUserIds.has(member.userId) ? (
                      <Badge tone="warning" className="uppercase tracking-wide">
                        temp
                      </Badge>
                    ) : null}{" "}
                    <span className="text-muted">(weight {member.allocationWeight})</span>
                  </span>
                  {canManage ? (
                    <form action={removeCampaignMemberAction.bind(null, id, member.userId)}>
                      <button
                        type="submit"
                        className="text-xs text-accent hover:underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </form>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          {canManage ? (
            <div className="mt-6">
              <AddCampaignMemberForm
                action={boundAddMember}
                candidates={memberCandidates.map((user) => ({
                  id: user.id,
                  fullName: user.roleName
                    ? `${user.fullName} (${user.roleName})`
                    : user.fullName,
                }))}
              />
            </div>
          ) : null}
          {canSetTemporaryCaller ? (
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-sm font-medium">Temporary caller (holiday cover)</h3>
              <div className="mt-4">
                <TemporaryCampaignReassignForm
                  setAction={boundTemporaryReassign}
                  endAction={boundEndTemporaryReassign}
                  fromCallers={fromCallersForTemp}
                  orgAgents={orgAgentsForTemp.map((user) => ({
                    userId: user.id,
                    fullName: user.roleName
                      ? `${user.fullName} (${user.roleName})`
                      : user.fullName,
                  }))}
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "leads" ? (
        <section className="mx-card overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">Lead List</h2>
            {canAssign ? (
              <span className="text-muted text-xs">Redistribute via Analytics / Assign tab tools</span>
            ) : null}
          </div>
          <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="tab" value="leads" />
            <input type="hidden" name="page" value="1" />
            <input
              name="search"
              defaultValue={typeof query.search === "string" ? query.search : ""}
              placeholder="Search searchable fields…"
              className="mx-input"
            />
            <label className="text-sm">
              Employee
              <select
                name="employeeId"
                defaultValue={safeEmployeeId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All assigned callers</option>
                {assignableMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {nameFromMap(userNameById, member.userId)}
                    {tempAssigneeUserIds.has(member.userId) ? " (temp)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {activeFields
              .filter(
                (field) =>
                  field.isFilterable && !["full_name", "phone", "email"].includes(field.internalKey),
              )
              .slice(0, 5)
              .map((field) => (
                <input
                  key={field.id}
                  name={`ff_${field.internalKey}`}
                  defaultValue={fieldFilterParams[field.internalKey] ?? ""}
                  placeholder={field.name}
                  className="mx-input"
                />
              ))}
            <button type="submit" className="mx-btn mx-btn-secondary">
              Apply filters
            </button>
          </form>
          {safeEmployeeId ? (
            <p className="text-muted mb-3 text-sm">
              Showing customers assigned to{" "}
              <EmployeeLink
                userId={safeEmployeeId}
                name={nameFromMap(userNameById, safeEmployeeId)}
                campaignId={id}
              />
              .
            </p>
          ) : null}
          <p className="text-muted mb-3 text-xs">
            Showing {leads.length.toLocaleString()} of {filteredLeadCount.toLocaleString()} lead(s)
            {leadTotalPages > 1 ? ` · page ${leadPage} of ${leadTotalPages}` : ""}.
          </p>
          <CampaignLeadsTable
            showNotes={isDndCampaign}
            rows={leads.map((lead) => ({
              id: lead.id,
              fullNameSnapshot: lead.fullNameSnapshot,
              phoneSnapshot: lead.phoneSnapshot,
              currentStageName: lead.currentStageName,
              assignedAgent: lead.currentAssigneeUserId
                ? nameFromMap(userNameById, lead.currentAssigneeUserId)
                : "Unassigned",
              assignedAgentUserId: lead.currentAssigneeUserId,
              isTemporaryAssignee: lead.isTemporaryAssignee,
              campaignId: id,
              nextActionAt: lead.nextActionAt,
              priority: "—",
              latestNote: latestNoteByLeadId.get(lead.id) ?? null,
            }))}
          />
          {leadTotalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {leadPage > 1 ? (
                <Link
                  href={`/campaigns/${id}?tab=leads&page=${leadPage - 1}${
                    typeof query.search === "string" && query.search
                      ? `&search=${encodeURIComponent(query.search)}`
                      : ""
                  }${safeEmployeeId ? `&employeeId=${encodeURIComponent(safeEmployeeId)}` : ""}`}
                  className="text-accent hover:underline underline-offset-4"
                >
                  ← Previous
                </Link>
              ) : null}
              {leadPage < leadTotalPages ? (
                <Link
                  href={`/campaigns/${id}?tab=leads&page=${leadPage + 1}${
                    typeof query.search === "string" && query.search
                      ? `&search=${encodeURIComponent(query.search)}`
                      : ""
                  }${safeEmployeeId ? `&employeeId=${encodeURIComponent(safeEmployeeId)}` : ""}`}
                  className="text-accent hover:underline underline-offset-4"
                >
                  Next →
                </Link>
              ) : null}
            </div>
          ) : null}
          {canAssign ? (
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-sm font-medium">Redistribute / move leads</h3>
              <p className="text-muted mt-1 text-xs">
                Run Round Robin, Equal, Random, or Manual assignment. Enable redistribution to
                reassign leads between agents.
              </p>
              <div className="mt-4">
                <AssignCampaignLeadsForm
                  action={boundAssignLeads}
                  leads={leads.map((lead) => ({
                    id: lead.id,
                    fullNameSnapshot: lead.fullNameSnapshot,
                    currentStageName: lead.currentStageName,
                    assigned: Boolean(lead.currentAssigneeUserId),
                  }))}
                  members={assignableMembers.map((member) => ({
                    userId: member.userId,
                    fullName: nameFromMap(userNameById, member.userId),
                  }))}
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "imports" ? (
        <section className="mx-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Add from Excel History</h2>
          </div>
          <ul className="text-sm">
            {importBatches.length === 0 ? (
              <li className="text-muted px-4 py-6 text-center">
                Nothing added from Excel for this campaign.
              </li>
            ) : (
              importBatches.map((batch) => (
                <li
                  key={batch.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-border px-4 py-3 last:border-0"
                >
                  <span>
                    {batch.sourceFileName} · {batch.status}
                  </span>
                  <span className="text-muted">
                    {batch.createdRowCount} added · {batch.duplicateRowCount} duplicates ·{" "}
                    {new Date(batch.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {tab === "analytics" ? (
        <>
          <section className="mx-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Analytics</h2>
              <Link href={`/campaigns/${id}/dashboard`} className="text-accent text-sm hover:underline">
                Open Campaign Dashboard
              </Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Active members</dt>
              <dd>{statistics.activeMemberCount}</dd>
              <dt className="text-muted">Assignment batches run</dt>
              <dd>{statistics.assignmentBatchCount}</dd>
              <dt className="text-muted">Total Leads allocated</dt>
              <dd>{statistics.totalLeadsAllocated}</dd>
              <dt className="text-muted">Completed / Failed batches</dt>
              <dd>
                {statistics.completedAssignmentBatches} / {statistics.failedAssignmentBatches}
              </dd>
              <dt className="text-muted">Current campaign leads</dt>
              <dd>{leads.length}</dd>
            </dl>
          </section>
          <section className="mx-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Activity</h2>
            </div>
            <ul className="flex flex-col">
              {auditLog.length === 0 ? (
                <li className="text-muted px-4 py-6 text-center text-sm">No activity yet.</li>
              ) : (
                auditLog.map((record) => (
                  <li
                    key={record.id}
                    className="flex justify-between border-b border-border px-4 py-3 text-sm last:border-0"
                  >
                    <span>{record.action}</span>
                    <span className="text-muted">
                      {new Date(record.occurredAt).toLocaleString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
