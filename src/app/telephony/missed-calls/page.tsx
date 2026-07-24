import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getPermissionScope } from "@/modules/rbac";
import { listMissedCalls } from "@/modules/telephony";

export default async function TelephonyMissedCallsPage() {
  const { session, authContext } = await requirePermission("call.view");

  const scope = getPermissionScope(authContext, "call.view");
  const filter = scope === "SELF" ? { agentUserId: session.user.id } : undefined;

  const calls = await listMissedCalls(authContext.organizationId, filter);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/telephony/calls" className="text-sm underline underline-offset-4">
        ← All Calls
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Missed Calls</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Calls that never connected — No Answer, Busy, Failed, or Abandoned.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Direction</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Initiated</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">
                  No Missed Calls.
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr
                  key={call.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{call.direction}</td>
                  <td className="px-4 py-3">{call.status}</td>
                  <td className="px-4 py-3">{new Date(call.initiatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/telephony/calls/${call.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
