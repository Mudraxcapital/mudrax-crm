import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  CallAttemptNotFoundError,
  getCallAttempt,
  listCallAttemptAuditLog,
  listCallNotes,
  listCallOutcomes,
  listCallRecordings,
} from "@/modules/telephony";
import { CallStatusForm } from "@/modules/telephony/presentation/components/CallStatusForm";
import { CallNoteForm } from "@/modules/telephony/presentation/components/CallNoteForm";
import { CallRecordingForm } from "@/modules/telephony/presentation/components/CallRecordingForm";
import { updateCallAttemptStatusAction } from "@/modules/telephony/presentation/controllers/updateCallAttemptStatus.action";
import { addCallNoteAction } from "@/modules/telephony/presentation/controllers/addCallNote.action";
import { updateCallNoteAction } from "@/modules/telephony/presentation/controllers/updateCallNote.action";
import { createCallRecordingAction } from "@/modules/telephony/presentation/controllers/createCallRecording.action";

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

  const [outcomes, notes, recordings, auditLog] = await Promise.all([
    listCallOutcomes(authContext.organizationId),
    listCallNotes(id),
    listCallRecordings(id),
    listCallAttemptAuditLog(id),
  ]);

  const canUpdate = hasPermission(authContext, "call.update");
  const canManageNotes = hasPermission(authContext, "call.note.manage");
  const canLogRecordings = hasPermission(authContext, "call.recording.log");

  const boundUpdateStatus = updateCallAttemptStatusAction.bind(null, id);
  const boundAddNote = addCallNoteAction.bind(null, id);
  const boundCreateRecording = createCallRecordingAction.bind(null, id);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/telephony/calls" className="text-sm underline underline-offset-4">
        ← Back to Calls
      </Link>

      <div>
        <h1 className="text-lg font-semibold">
          {call.direction} Call · {call.status}
        </h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Initiated {new Date(call.initiatedAt).toLocaleString()}
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-foreground/60">Disposition</dt>
          <dd>{call.disposition ?? "—"}</dd>
          <dt className="text-foreground/60">Call Outcome</dt>
          <dd>{call.callOutcomeName ?? "—"}</dd>
          <dt className="text-foreground/60">Duration</dt>
          <dd>{call.durationSeconds !== null ? `${call.durationSeconds}s` : "—"}</dd>
          <dt className="text-foreground/60">Provider Call Id</dt>
          <dd>{call.providerCallId ?? "—"}</dd>
          {call.leadId ? (
            <>
              <dt className="text-foreground/60">Lead</dt>
              <dd>
                <Link href={`/leads/${call.leadId}`} className="underline underline-offset-4">
                  View Lead
                </Link>
              </dd>
            </>
          ) : null}
          {call.customerId ? (
            <>
              <dt className="text-foreground/60">Customer</dt>
              <dd>
                <Link
                  href={`/customers/${call.customerId}`}
                  className="underline underline-offset-4"
                >
                  View Customer
                </Link>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      {canUpdate ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Update Status</h2>
          <div className="mt-4">
            <CallStatusForm action={boundUpdateStatus} outcomes={outcomes} />
          </div>
        </section>
      ) : null}

      {canManageNotes ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Notes</h2>
          <div className="mt-4">
            <CallNoteForm action={boundAddNote} submitLabel="Add Note" />
          </div>
          <ul className="mt-6 flex flex-col gap-4">
            {notes.length === 0 ? (
              <li className="text-foreground/60 text-sm">No notes yet.</li>
            ) : (
              notes.map((note) => {
                const boundUpdateNote = updateCallNoteAction.bind(null, id, note.id);
                return (
                  <li
                    key={note.id}
                    className="border-t border-black/5 pt-4 first:border-0 first:pt-0 dark:border-white/10"
                  >
                    <p className="text-foreground/60 text-xs">
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
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Recordings</h2>
          <div className="mt-4">
            <CallRecordingForm action={boundCreateRecording} />
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-sm">
            {recordings.length === 0 ? (
              <li className="text-foreground/60">No recordings logged yet.</li>
            ) : (
              recordings.map((recording) => (
                <li key={recording.id} className="flex items-center justify-between">
                  <span>{recording.storageReference}</span>
                  <span className="text-foreground/60">
                    {recording.durationSeconds !== null ? `${recording.durationSeconds}s` : "—"}
                  </span>
                </li>
              ))
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
