import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { assertOwnsManagerData, hasPermission } from "@/modules/rbac";
import {
  CampaignNotFoundError,
  getCampaign,
  getCampaignStatistics,
  listCampaignAuditLog,
  listCampaignMembers,
} from "@/modules/campaigns";
import { countLeads, listActiveLeadFields, listImportBatches, listLeads } from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { CampaignStatusForm } from "@/modules/campaigns/presentation/components/CampaignStatusForm";
import { AddCampaignMemberForm } from "@/modules/campaigns/presentation/components/AddCampaignMemberForm";
import { AssignCampaignLeadsForm } from "@/modules/campaigns/presentation/components/AssignCampaignLeadsForm";
import { changeCampaignStatusAction } from "@/modules/campaigns/presentation/controllers/changeCampaignStatus.action";
import { addCampaignMemberAction } from "@/modules/campaigns/presentation/controllers/addCampaignMember.action";
import { removeCampaignMemberAction } from "@/modules/campaigns/presentation/controllers/removeCampaignMember.action";
import { assignCampaignLeadsAction } from "@/modules/campaigns/presentation/controllers/assignCampaignLeads.action";
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
    if (!assertOwnsManagerData(authContext.hierarchy, campaign.ownerManagerId)) {
      notFound();
    }
  } catch (error) {
    if (error instanceof CampaignNotFoundError) {
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

  const [members, statistics, auditLog, users, leads, totalLeadCount, importBatches] =
    await Promise.all([
      listCampaignMembers(id),
      getCampaignStatistics(id),
      listCampaignAuditLog(id),
      listUserSummaries(authContext.organizationId),
      listLeads(authContext.organizationId, {
        campaignId: id,
        limit: 100_000,
        assignedToUserIds: employeeId ? [employeeId] : undefined,
        fieldFilters: Object.keys(fieldFilterParams).length > 0 ? fieldFilterParams : undefined,
        searchableCustomKeys: activeFields
          .filter((field) => field.isSearchable)
          .map((field) => field.internalKey)
          .filter((key) => !["full_name", "phone", "email"].includes(key)),
        search: typeof query.search === "string" ? query.search : undefined,
      }),
      countLeads(authContext.organizationId, { campaignId: id }),
      listImportBatches(authContext.organizationId, { campaignId: id }),
    ]);

  const canManage = hasPermission(authContext, "campaign.manage");
  const canAssign = hasPermission(authContext, "campaign.assign");
  const canImport = hasPermission(authContext, "lead.import");

  const userNameById = new Map(users.map((user) => [user.id, user.fullName]));
  const activeMembers = members.filter((member) => member.isActive);
  const memberCandidates = users.filter(
    (user) =>
      user.status === "ACTIVE" && !activeMembers.some((member) => member.userId === user.id),
  );
  const boundChangeStatus = changeCampaignStatusAction.bind(null, id);
  const boundAddMember = addCampaignMemberAction.bind(null, id);
  const boundAssignLeads = assignCampaignLeadsAction.bind(
    null,
    id,
    activeMembers.map((member) => member.userId),
  );

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

  const distribution = activeMembers.map((member) => {
    const count = leads.filter((lead) => lead.currentAssigneeUserId === member.userId).length;
    return {
      userId: member.userId,
      name: nameFromMap(userNameById, member.userId),
      count,
    };
  });

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
                    <EmployeeLink userId={item.userId} name={item.name} campaignId={id} />
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
                  <span>
                    <EmployeeLink
                      userId={member.userId}
                      name={nameFromMap(userNameById, member.userId)}
                      campaignId={id}
                    />{" "}
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
                  fullName: user.fullName,
                }))}
              />
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
                defaultValue={employeeId ?? ""}
                className="mx-input mt-1 w-full"
              >
                <option value="">All assigned callers</option>
                {activeMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {nameFromMap(userNameById, member.userId)}
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
          {employeeId ? (
            <p className="text-muted mb-3 text-sm">
              Showing customers assigned to{" "}
              <EmployeeLink
                userId={employeeId}
                name={nameFromMap(userNameById, employeeId)}
                campaignId={id}
              />
              .
            </p>
          ) : null}
          <CampaignLeadsTable
            rows={leads.map((lead) => ({
              id: lead.id,
              fullNameSnapshot: lead.fullNameSnapshot,
              phoneSnapshot: lead.phoneSnapshot,
              currentStageName: lead.currentStageName,
              assignedAgent: lead.currentAssigneeUserId
                ? nameFromMap(userNameById, lead.currentAssigneeUserId)
                : "Unassigned",
              assignedAgentUserId: lead.currentAssigneeUserId,
              campaignId: id,
              nextActionAt: lead.nextActionAt,
              priority: "—",
            }))}
          />
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
                  members={activeMembers.map((member) => ({
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
            <h2 className="text-sm font-medium">Analytics</h2>
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
