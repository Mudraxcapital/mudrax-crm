import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getCustomer } from "@/modules/customers";
import { getLead } from "@/modules/leads";
import {
  CallAttemptNotFoundError,
  getCallAttempt,
  listCallAttemptAuditLog,
  listCallNotes,
  listCallOutcomes,
  listCallRecordings,
} from "@/modules/telephony";
import { getUser } from "@/modules/users";
import { CallStatusForm } from "@/modules/telephony/presentation/components/CallStatusForm";
import { CallNoteForm } from "@/modules/telephony/presentation/components/CallNoteForm";
import { CallRecordingForm } from "@/modules/telephony/presentation/components/CallRecordingForm";
import { updateCallAttemptStatusAction } from "@/modules/telephony/presentation/controllers/updateCallAttemptStatus.action";
import { addCallNoteAction } from "@/modules/telephony/presentation/controllers/addCallNote.action";
import { updateCallNoteAction } from "@/modules/telephony/presentation/controllers/updateCallNote.action";
import { createCallRecordingAction } from "@/modules/telephony/presentation/controllers/createCallRecording.action";
import { resolveDisplayName } from "@/shared/ui/displayName";

export default async function TelephonyCallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { authContext } = await requirePermission("call.view");
  const { id } = await params;

  let call;
  try {
    call = await getCallAttempt(id);
  } catch (error) {
    if (error instanceof CallAttemptNotFoundError) {
      notFound();
    }
    throw error;
  }

  const [outcomes, notes, recordings, auditLog, lead, customer, agent] = await Promise.all([
    listCallOutcomes(authContext.organizationId),
    listCallNotes(id),
    listCallRecordings(id),
    listCallAttemptAuditLog(id),
    call.leadId ? getLead(call.leadId).catch(() => null) : Promise.resolve(null),
    call.customerId ? getCustomer(call.customerId).catch(() => null) : Promise.resolve(null),
    call.agentUserId ? getUser(call.agentUserId).catch(() => null) : Promise.resolve(null),
  ]);

  const canUpdate = hasPermission(authContext, "call.update");
  const canManageNotes = hasPermission(authContext, "call.note.manage");
  const canLogRecordings = hasPermission(authContext, "call.recording.log");

  const boundUpdateStatus = updateCallAttemptStatusAction.bind(null, id);
  const boundAddNote = addCallNoteAction.bind(null, id);
  const boundCreateRecording = createCallRecordingAction.bind(null, id);

  const leadName = resolveDisplayName(lead?.fullNameSnapshot, null, "Lead");
  const customerName = resolveDisplayName(customer?.fullName, null, "Customer");
  const agentName = resolveDisplayName(agent?.fullName, null, "Agent");

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/telephony/calls" className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Calls
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {call.direction} Call · {call.status}
        </h1>
        <p className="text-muted mt-1 text-sm">
          Initiated {new Date(call.initiatedAt).toLocaleString()}
          {call.agentUserId ? ` · Agent ${agentName}` : ""}
        </p>
      </div>

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Disposition</dt>
          <dd>{call.disposition ?? "—"}</dd>
          <dt className="text-muted">Call Outcome</dt>
          <dd>{call.callOutcomeName ?? "—"}</dd>
          <dt className="text-muted">Duration</dt>
          <dd>{call.durationSeconds !== null ? `${call.durationSeconds}s` : "—"}</dd>
          <dt className="text-muted">Provider Call Id</dt>
          <dd className="font-mono text-xs">{call.providerCallId ?? "—"}</dd>
          {call.leadId ? (
            <>
              <dt className="text-muted">Lead</dt>
              <dd>
                <Link
                  href={`/leads/${call.leadId}`}
                  className="text-accent hover:underline underline-offset-4"
                >
                  {leadName}
                </Link>
              </dd>
            </>
          ) : null}
          {call.customerId ? (
            <>
              <dt className="text-muted">Customer</dt>
              <dd>
                <Link
                  href={`/customers/${call.customerId}`}
                  className="text-accent hover:underline underline-offset-4"
                >
                  {customerName}
                </Link>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      {canUpdate ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Update Status</h2>
          <div className="mt-4">
            <CallStatusForm action={boundUpdateStatus} outcomes={outcomes} />
          </div>
        </section>
      ) : null}

      {canManageNotes ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Notes</h2>
          <div className="mt-4">
            <CallNoteForm action={boundAddNote} submitLabel="Add Note" />
          </div>
          <ul className="mt-6 flex flex-col gap-4">
            {notes.length === 0 ? (
              <li className="text-muted text-sm">No notes yet.</li>
            ) : (
              notes.map((note) => {
                const boundUpdateNote = updateCallNoteAction.bind(null, id, note.id);
                return (
                  <li
                    key={note.id}
                    className="border-t border-border pt-4 first:border-0 first:pt-0 "
                  >
                    <p className="text-muted text-xs">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <CallNoteForm
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

      {canLogRecordings ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Recordings</h2>
          <div className="mt-4">
            <CallRecordingForm action={boundCreateRecording} />
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-sm">
            {recordings.length === 0 ? (
              <li className="text-muted">No recordings logged yet.</li>
            ) : (
              recordings.map((recording) => (
                <li key={recording.id} className="flex items-center justify-between">
                  <span>{recording.storageReference}</span>
                  <span className="text-muted">
                    {recording.durationSeconds !== null ? `${recording.durationSeconds}s` : "—"}
                  </span>
                </li>
              ))
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
