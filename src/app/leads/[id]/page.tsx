import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  getLead,
  LeadNotFoundError,
  leadCatalogs,
  listLeadAssignmentHistory,
  listLeadAuditLog,
  listLeadNotes,
} from "@/modules/leads";
import { listUserSummaries } from "@/modules/users";
import { LeadStageForm } from "@/modules/leads/presentation/components/LeadStageForm";
import { LeadAssignForm } from "@/modules/leads/presentation/components/LeadAssignForm";
import { LeadNoteForm } from "@/modules/leads/presentation/components/LeadNoteForm";
import { changeLeadStageAction } from "@/modules/leads/presentation/controllers/changeLeadStage.action";
import { assignLeadAction } from "@/modules/leads/presentation/controllers/assignLead.action";
import { addLeadNoteAction } from "@/modules/leads/presentation/controllers/addLeadNote.action";
import { updateLeadNoteAction } from "@/modules/leads/presentation/controllers/updateLeadNote.action";
import { listFollowUpsByLead } from "@/modules/follow-ups";
import { FollowUpForm } from "@/modules/follow-ups/presentation/components/FollowUpForm";
import { CompleteFollowUpForm } from "@/modules/follow-ups/presentation/components/CompleteFollowUpForm";
import { ReassignFollowUpForm } from "@/modules/follow-ups/presentation/components/ReassignFollowUpForm";
import { createFollowUpAction } from "@/modules/follow-ups/presentation/controllers/createFollowUp.action";
import { completeFollowUpAction } from "@/modules/follow-ups/presentation/controllers/completeFollowUp.action";
import { reassignFollowUpAction } from "@/modules/follow-ups/presentation/controllers/reassignFollowUp.action";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { authContext } = await requirePermission("lead.view");
  const { id } = await params;

  let lead;
  try {
    lead = await getLead(id);
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      notFound();
    }
    throw error;
  }

  const [stages, lostReasons, assignees, assignments, notes, auditLog, followUps] =
    await Promise.all([
      leadCatalogs.listStages(authContext.organizationId),
      leadCatalogs.listLostReasons(authContext.organizationId),
      listUserSummaries(authContext.organizationId),
      listLeadAssignmentHistory(id),
      listLeadNotes(id),
      listLeadAuditLog(id),
      listFollowUpsByLead(id),
    ]);

  const canUpdate = hasPermission(authContext, "lead.update");
  const canReassign = hasPermission(authContext, "lead.reassign");
  const canCreateFollowUp = hasPermission(authContext, "follow_up.create");
  const canCompleteFollowUp = hasPermission(authContext, "follow_up.complete");
  const canReassignFollowUp = hasPermission(authContext, "follow_up.reassign");
  const assigneeOptions = assignees.map((user) => ({ id: user.id, fullName: user.fullName }));
  const assigneeNameById = new Map(assigneeOptions.map((user) => [user.id, user.fullName]));

  const boundChangeStage = changeLeadStageAction.bind(null, id);
  const boundAssign = assignLeadAction.bind(null, id);
  const boundAddNote = addLeadNoteAction.bind(null, id);
  const boundCreateFollowUp = createFollowUpAction.bind(null, id);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/leads" className="text-sm underline underline-offset-4">
        ← Back to Leads
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{lead.fullNameSnapshot}</h1>
          <p className="text-foreground/60 mt-1 text-sm">
            {lead.currentStageName} · {lead.leadSourceName}
          </p>
        </div>
        {canUpdate ? (
          <Link href={`/leads/${lead.id}/edit`} className="text-sm underline underline-offset-4">
            Edit
          </Link>
        ) : null}
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-foreground/60">Phone</dt>
          <dd>{lead.phoneSnapshot ?? "—"}</dd>
          <dt className="text-foreground/60">Email</dt>
          <dd>{lead.emailSnapshot ?? "—"}</dd>
          <dt className="text-foreground/60">Current assignee</dt>
          <dd>
            {lead.currentAssigneeUserId
              ? (assigneeNameById.get(lead.currentAssigneeUserId) ?? lead.currentAssigneeUserId)
              : "Unassigned"}
          </dd>
          <dt className="text-foreground/60">Lost reason</dt>
          <dd>{lead.lostReasonName ?? "—"}</dd>
          <dt className="text-foreground/60">
            <Link href={`/customers/${lead.customerId}`} className="underline underline-offset-4">
              View Customer
            </Link>
          </dt>
        </dl>
      </section>

      {canUpdate ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Change Stage</h2>
          <div className="mt-4">
            <LeadStageForm
              action={boundChangeStage}
              currentStageId={lead.currentStageId}
              stages={stages}
              lostReasons={lostReasons}
            />
          </div>
        </section>
      ) : null}

      {canReassign ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Assignment</h2>
          <div className="mt-4">
            <LeadAssignForm
              action={boundAssign}
              currentAssigneeUserId={lead.currentAssigneeUserId}
              assignees={assigneeOptions}
            />
          </div>
          <div className="mt-6">
            <h3 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
              Assignment History
            </h3>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {assignments.length === 0 ? (
                <li className="text-foreground/60">No assignments yet.</li>
              ) : (
                assignments.map((assignment) => (
                  <li key={assignment.id} className="flex justify-between">
                    <span>
                      {assigneeNameById.get(assignment.assignedToUserId) ??
                        assignment.assignedToUserId}{" "}
                      <span className="text-foreground/60">({assignment.assignmentType})</span>
                    </span>
                    <span className="text-foreground/60">
                      {new Date(assignment.assignedAt).toLocaleString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      ) : null}

      {canUpdate ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Notes</h2>
          <div className="mt-4">
            <LeadNoteForm action={boundAddNote} submitLabel="Add Note" />
          </div>
          <ul className="mt-6 flex flex-col gap-4">
            {notes.length === 0 ? (
              <li className="text-foreground/60 text-sm">No notes yet.</li>
            ) : (
              notes.map((note) => {
                const boundUpdateNote = updateLeadNoteAction.bind(null, id, note.id);
                return (
                  <li
                    key={note.id}
                    className="border-t border-black/5 pt-4 first:border-0 first:pt-0 dark:border-white/10"
                  >
                    <p className="text-foreground/60 text-xs">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <LeadNoteForm
                        action={boundUpdateNote}
                        defaultBody={note.body}
                        submitLabel="Save Note"
                      />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      ) : null}

      {canCreateFollowUp || followUps.length > 0 ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Follow-ups</h2>
          {canCreateFollowUp ? (
            <div className="mt-4">
              <FollowUpForm action={boundCreateFollowUp} assignees={assigneeOptions} />
            </div>
          ) : null}
          <ul className="mt-6 flex flex-col gap-4">
            {followUps.length === 0 ? (
              <li className="text-foreground/60 text-sm">No Follow-ups yet.</li>
            ) : (
              followUps.map((followUp) => {
                const boundComplete = completeFollowUpAction.bind(null, id, followUp.id);
                const boundReassign = reassignFollowUpAction.bind(null, id, followUp.id);
                const isOpen = followUp.status !== "COMPLETED" && followUp.status !== "CANCELLED";
                return (
                  <li
                    key={followUp.id}
                    className="border-t border-black/5 pt-4 first:border-0 first:pt-0 dark:border-white/10"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {followUp.triggerType === "CALL_LATER" ? "Call Later" : "Follow-up"} ·{" "}
                        {new Date(followUp.scheduledFor).toLocaleString()}
                      </span>
                      <span className="text-foreground/60">{followUp.status}</span>
                    </div>
                    <p className="text-foreground/60 mt-1 text-xs">
                      Assigned to{" "}
                      {assigneeNameById.get(followUp.currentAssigneeUserId) ??
                        followUp.currentAssigneeUserId}
                    </p>
                    {followUp.outcomeNotes ? (
                      <p className="mt-1 text-sm">{followUp.outcomeNotes}</p>
                    ) : null}
                    {isOpen ? (
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                        {canCompleteFollowUp ? (
                          <CompleteFollowUpForm action={boundComplete} />
                        ) : null}
                        {canReassignFollowUp ? (
                          <ReassignFollowUpForm
                            action={boundReassign}
                            assignees={assigneeOptions}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Activity</h2>
        </div>
        <ul className="flex flex-col">
          {auditLog.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No activity yet.</li>
          ) : (
            auditLog.map((record) => (
              <li
                key={record.id}
                className="flex justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <span>{record.action}</span>
                <span className="text-foreground/60">
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
