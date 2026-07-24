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
    <div className="mx-page flex flex-col gap-6">
      <Link href="/telephony/calls" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← All Calls
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Missed Calls</h1>
        <p className="text-muted mt-1 text-sm">
          Calls that never connected — No Answer, Busy, Failed, or Abandoned.
        </p>
      </div>

      <section className="mx-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Direction</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Initiated</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-6 text-center">
                  No Missed Calls.
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr
                  key={call.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">{call.direction}</td>
                  <td className="px-4 py-3">{call.status}</td>
                  <td className="px-4 py-3">{new Date(call.initiatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/telephony/calls/${call.id}`}
                      className="text-sm text-accent hover:text-accent hover:underline underline-offset-4"
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
