import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  CampaignNotFoundError,
  getCampaign,
  getCampaignStatistics,
  listCampaignAuditLog,
  listCampaignMembers,
} from "@/modules/campaigns";
import { listLeads } from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { CampaignStatusForm } from "@/modules/campaigns/presentation/components/CampaignStatusForm";
import { AddCampaignMemberForm } from "@/modules/campaigns/presentation/components/AddCampaignMemberForm";
import { AssignCampaignLeadsForm } from "@/modules/campaigns/presentation/components/AssignCampaignLeadsForm";
import { changeCampaignStatusAction } from "@/modules/campaigns/presentation/controllers/changeCampaignStatus.action";
import { addCampaignMemberAction } from "@/modules/campaigns/presentation/controllers/addCampaignMember.action";
import { removeCampaignMemberAction } from "@/modules/campaigns/presentation/controllers/removeCampaignMember.action";
import { assignCampaignLeadsAction } from "@/modules/campaigns/presentation/controllers/assignCampaignLeads.action";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { authContext } = await requirePermission("campaign.view");
  const { id } = await params;

  let campaign;
  try {
    campaign = await getCampaign(id);
  } catch (error) {
    if (error instanceof CampaignNotFoundError) {
      notFound();
    }
    throw error;
  }

  const [members, statistics, auditLog, users, leads] = await Promise.all([
    listCampaignMembers(id),
    getCampaignStatistics(id),
    listCampaignAuditLog(id),
    listUserSummaries(authContext.organizationId),
    listLeads(authContext.organizationId, { campaignId: id }),
  ]);

  const canManage = hasPermission(authContext, "campaign.manage");
  const canAssign = hasPermission(authContext, "campaign.assign");

  const userNameById = new Map(users.map((user) => [user.id, user.fullName]));
  const activeMembers = members.filter((member) => member.isActive);
  const memberCandidates = users.filter(
    (user) => !activeMembers.some((member) => member.userId === user.id),
  );
  const unassignedLeads = leads.filter((lead) => !lead.currentAssigneeUserId);

  const boundChangeStatus = changeCampaignStatusAction.bind(null, id);
  const boundAddMember = addCampaignMemberAction.bind(null, id);
  const boundAssignLeads = assignCampaignLeadsAction.bind(
    null,
    id,
    activeMembers.map((member) => member.userId),
  );

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/campaigns" className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Campaigns
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-muted mt-1 text-sm">
            {campaign.status} · {campaign.startDate ?? "—"} → {campaign.endDate ?? "—"}
          </p>
        </div>
        {canManage ? (
          <Link
            href={`/campaigns/${campaign.id}/edit`}
            className="text-sm text-accent hover:underline underline-offset-4"
          >
            Edit
          </Link>
        ) : null}
      </div>

      {campaign.description ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Description</h2>
          <p className="text-foreground/80 mt-2 text-sm">{campaign.description}</p>
        </section>
      ) : null}

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Statistics</h2>
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
        </dl>
      </section>

      {canManage ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Status</h2>
          <div className="mt-4">
            <CampaignStatusForm action={boundChangeStatus} currentStatus={campaign.status} />
          </div>
        </section>
      ) : null}

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Members</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {activeMembers.length === 0 ? (
            <li className="text-muted">No active members yet.</li>
          ) : (
            activeMembers.map((member) => (
              <li key={member.userId} className="flex items-center justify-between">
                <span>
                  {userNameById.get(member.userId) ?? member.userId}{" "}
                  <span className="text-muted">(weight {member.allocationWeight})</span>
                </span>
                {canManage ? (
                  <form action={removeCampaignMemberAction.bind(null, id, member.userId)}>
                    <button type="submit" className="text-xs text-accent hover:underline underline-offset-4">
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

      {canAssign ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Assign Leads</h2>
          <div className="mt-4">
            <AssignCampaignLeadsForm
              action={boundAssignLeads}
              leads={unassignedLeads.map((lead) => ({
                id: lead.id,
                fullNameSnapshot: lead.fullNameSnapshot,
                currentStageName: lead.currentStageName,
              }))}
              members={activeMembers.map((member) => ({
                userId: member.userId,
                fullName: userNameById.get(member.userId) ?? member.userId,
              }))}
            />
          </div>
        </section>
      ) : null}

      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 ">
          <h2 className="text-sm font-medium">Activity</h2>
        </div>
        <ul className="flex flex-col">
          {auditLog.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">No activity yet.</li>
          ) : (
            auditLog.map((record) => (
              <li
                key={record.id}
                className="flex justify-between border-b border-border px-4 py-3 text-sm last:border-0 "
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
    </div>
  );
}
