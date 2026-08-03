import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission, isCallerWorkspaceUser } from "@/modules/rbac";
import { canAccessLead } from "@/shared/auth/assertCanAccessLead";
import {
  getLead,
  LeadNotFoundError,
  leadCatalogs,
  listActiveLeadFields,
  listLeadAssignmentHistory,
  listLeadAuditLog,
  listLeadNotes,
} from "@/modules/leads";
import { DynamicLeadFields } from "@/modules/leads/presentation/components/DynamicLeadFields";
import { listUserSummaries } from "@/modules/users";
import { LeadStageForm } from "@/modules/leads/presentation/components/LeadStageForm";
import { LeadAssignForm } from "@/modules/leads/presentation/components/LeadAssignForm";
import { LeadNoteForm } from "@/modules/leads/presentation/components/LeadNoteForm";
import { LeadClickToCallPanel } from "@/modules/leads/presentation/components/LeadClickToCallPanel";
import { changeLeadStageAction } from "@/modules/leads/presentation/controllers/changeLeadStage.action";
import { assignLeadAction } from "@/modules/leads/presentation/controllers/assignLead.action";
import { addLeadNoteAction } from "@/modules/leads/presentation/controllers/addLeadNote.action";
import { updateLeadNoteAction } from "@/modules/leads/presentation/controllers/updateLeadNote.action";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";
import { listFollowUpsByLead } from "@/modules/follow-ups";
import { FollowUpForm } from "@/modules/follow-ups/presentation/components/FollowUpForm";
import { CompleteFollowUpForm } from "@/modules/follow-ups/presentation/components/CompleteFollowUpForm";
import { ReassignFollowUpForm } from "@/modules/follow-ups/presentation/components/ReassignFollowUpForm";
import { createFollowUpAction } from "@/modules/follow-ups/presentation/controllers/createFollowUp.action";
import { completeFollowUpAction } from "@/modules/follow-ups/presentation/controllers/completeFollowUp.action";
import { reassignFollowUpAction } from "@/modules/follow-ups/presentation/controllers/reassignFollowUp.action";
import { getCustomer } from "@/modules/customers";
import { nameFromMap, resolveDisplayName } from "@/shared/ui/displayName";
import { humanizeAuditAction } from "@/shared/ui/humanizeAuditAction";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, authContext } = await requirePermission("lead.view");
  const { id } = await params;

  if (isCallerWorkspaceUser(authContext)) {
    redirect(`/caller/leads/${id}`);
  }

  let lead;
  try {
    lead = await getLead(id);
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (
    !canAccessLead(authContext, lead, {
      permissionCode: "lead.view",
      actorUserId: session.user.id,
    })
  ) {
    notFound();
  }

  const [
    stages,
    lostReasons,
    assigneesRaw,
    assignments,
    notes,
    auditLog,
    followUps,
    fields,
    customer,
  ] = await Promise.all([
    leadCatalogs.listStages(authContext.organizationId),
    leadCatalogs.listLostReasons(authContext.organizationId),
    listUserSummaries(authContext.organizationId),
    listLeadAssignmentHistory(id),
    listLeadNotes(id),
    listLeadAuditLog(id),
    listFollowUpsByLead(id),
    listActiveLeadFields(authContext.organizationId),
    getCustomer(lead.customerId).catch(() => null),
  ]);

  const fieldValues: Record<string, string | undefined> = {
    full_name: lead.fullNameSnapshot,
    phone: lead.phoneSnapshot ?? undefined,
    email: lead.emailSnapshot ?? undefined,
  };
  for (const value of lead.fieldValues ?? []) {
    fieldValues[value.internalKey] = value.displayValue;
  }

  const canUpdate = hasPermission(authContext, "lead.update");
  const canReassign = hasPermission(authContext, "lead.reassign");
  const canCall = hasPermission(authContext, "call.initiate");
  const canCreateFollowUp = hasPermission(authContext, "follow_up.create");
  const canCompleteFollowUp = hasPermission(authContext, "follow_up.complete");
  const canReassignFollowUp = hasPermission(authContext, "follow_up.reassign");
  const visibleIds = authContext.hierarchy.visibleUserIds;
  const assignees = visibleIds
    ? assigneesRaw.filter((user) => visibleIds.includes(user.id))
    : assigneesRaw;
  const assigneeOptions = assignees.map((user) => ({ id: user.id, fullName: user.fullName }));
  const assigneeNameById = new Map(
    assigneesRaw.map((user) => [user.id, user.fullName] as const),
  );
  const customerName = resolveDisplayName(customer?.fullName, null, "Customer");

  const boundChangeStage = changeLeadStageAction.bind(null, id);
  const boundAssign = assignLeadAction.bind(null, id);
  const boundAddNote = addLeadNoteAction.bind(null, id);
  const boundCreateFollowUp = createFollowUpAction.bind(null, id);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/leads" className="text-sm text-accent hover:underline underline-offset-4">
        ← All Leads
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{lead.fullNameSnapshot}</h1>
          <p className="text-muted mt-1 text-sm">
            {lead.currentStageName} · {lead.leadSourceName}
          </p>
        </div>
        {canUpdate ? (
          <Link href={`/leads/${lead.id}/edit`} className="text-sm text-accent hover:underline underline-offset-4">
            Edit
          </Link>
        ) : null}
      </div>

      {canCall ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Click to Call</h2>
          <p className="text-muted mt-1 text-xs">
            Calls must be placed from the mobile app. Use this page for notes, stage, and follow-ups.
          </p>
          <div className="mt-4">
            <LeadClickToCallPanel
              leadId={lead.id}
              customerId={lead.customerId}
              phone={lead.phoneSnapshot}
              agentUserId={session.user.id}
            />
          </div>
        </section>
      ) : null}

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Details</h2>
        <div className="mt-4">
          <DynamicLeadFields fields={fields} values={fieldValues} readOnly />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Current assignee</dt>
          <dd>
            {lead.currentAssigneeUserId
              ? nameFromMap(assigneeNameById, lead.currentAssigneeUserId, "Unassigned")
              : "Unassigned"}
          </dd>
          <dt className="text-muted">Customer</dt>
          <dd>
            <Link
              href={`/customers/${lead.customerId}`}
              className="text-accent hover:underline underline-offset-4"
            >
              {customerName}
            </Link>
          </dd>
          <dt className="text-muted">Lost reason</dt>
          <dd>{lead.lostReasonName ?? "—"}</dd>
        </dl>
      </section>

      {canUpdate ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Change Stage</h2>
          <div className="mt-4">
            <LeadStageForm
              action={boundChangeStage}
              currentStageId={lead.currentStageId}
              stages={excludeTestCatalogRows(stages)}
              lostReasons={excludeTestCatalogRows(lostReasons)}
            />
          </div>
        </section>
      ) : null}

      {canReassign ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Assignment</h2>
          <div className="mt-4">
            <LeadAssignForm
              action={boundAssign}
              currentAssigneeUserId={lead.currentAssigneeUserId}
              assignees={assigneeOptions}
            />
          </div>
          <div className="mt-6">
            <h3 className="text-muted text-xs font-medium tracking-wide uppercase">
              Assignment History
            </h3>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {assignments.length === 0 ? (
                <li className="text-muted">No assignments yet.</li>
              ) : (
                assignments.map((assignment) => (
                  <li key={assignment.id} className="flex justify-between">
                    <span>
                      {nameFromMap(assigneeNameById, assignment.assignedToUserId)}{" "}
                      <span className="text-muted">({assignment.assignmentType})</span>
                    </span>
                    <span className="text-muted">
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
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Notes</h2>
          <div className="mt-4">
            <LeadNoteForm action={boundAddNote} submitLabel="Add Note" />
          </div>
          <ul className="mt-6 flex flex-col gap-4">
            {notes.length === 0 ? (
              <li className="text-muted text-sm">No notes yet.</li>
            ) : (
              notes.map((note) => {
                const boundUpdateNote = updateLeadNoteAction.bind(null, id, note.id);
                return (
                  <li
                    key={note.id}
                    className="border-t border-border pt-4 first:border-0 first:pt-0 "
                  >
                    <p className="text-muted text-xs">
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
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Follow-ups</h2>
          {canCreateFollowUp ? (
            <div className="mt-4">
              <FollowUpForm action={boundCreateFollowUp} assignees={assigneeOptions} />
            </div>
          ) : null}
          <ul className="mt-6 flex flex-col gap-4">
            {followUps.length === 0 ? (
              <li className="text-muted text-sm">No Follow-ups yet.</li>
            ) : (
              followUps.map((followUp) => {
                const boundComplete = completeFollowUpAction.bind(null, id, followUp.id);
                const boundReassign = reassignFollowUpAction.bind(null, id, followUp.id);
                const isOpen = followUp.status !== "COMPLETED" && followUp.status !== "CANCELLED";
                return (
                  <li
                    key={followUp.id}
                    className="border-t border-border pt-4 first:border-0 first:pt-0 "
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {followUp.triggerType === "CALL_LATER" ? "Call Later" : "Follow-up"} ·{" "}
                        {new Date(followUp.scheduledFor).toLocaleString()}
                      </span>
                      <span className="text-muted">{followUp.status}</span>
                    </div>
                    <p className="text-muted mt-1 text-xs">
                      Assigned to{" "}
                      {nameFromMap(assigneeNameById, followUp.currentAssigneeUserId)}
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
                <span>{humanizeAuditAction(record.action)}</span>
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
