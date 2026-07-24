import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { getTelephonyDashboard } from "@/modules/telephony";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default async function TelephonyDashboardPage() {
  const { authContext } = await requirePermission("telephony.dashboard.view");

  const dashboard = await getTelephonyDashboard(authContext.organizationId);

  const averageDurationLabel =
    dashboard.averageCallDurationSeconds !== null
      ? `${Math.floor(dashboard.averageCallDurationSeconds / 60)}m ${dashboard.averageCallDurationSeconds % 60}s`
      : "—";

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Telephony Dashboard</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Operational overview of today&apos;s Call activity.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Calls Today" value={dashboard.callsToday} />
        <StatCard label="Connected Calls" value={dashboard.connectedCallsToday} />
        <StatCard label="Missed Calls" value={dashboard.missedCallsToday} />
        <StatCard label="Avg. Duration" value={averageDurationLabel} />
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Calls by Agent</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {dashboard.callsByAgent.length === 0 ? (
            <li className="text-foreground/60">No Calls today.</li>
          ) : (
            dashboard.callsByAgent.map((entry) => (
              <li
                key={entry.agentUserId ?? "unassigned"}
                className="flex items-center justify-between"
              >
                <span>{entry.agentName}</span>
                <span className="font-medium">{entry.count}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Recent Calls</h2>
          <Link href="/telephony/calls" className="text-xs underline underline-offset-4">
            View all →
          </Link>
        </div>
        <ul className="flex flex-col">
          {dashboard.recentCalls.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">No Calls yet.</li>
          ) : (
            dashboard.recentCalls.map((call) => (
              <li
                key={call.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <Link href={`/telephony/calls/${call.id}`} className="underline underline-offset-4">
                  {call.direction} · {call.status}
                </Link>
                <span className="text-foreground/60">
                  {new Date(call.initiatedAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/telephony/calls" className="underline underline-offset-4">
          Calls →
        </Link>
        <Link href="/telephony/missed-calls" className="underline underline-offset-4">
          Missed Calls →
        </Link>
        <Link href="/telephony/agent-sessions" className="underline underline-offset-4">
          Agent Sessions →
        </Link>
        <Link href="/telephony/outcomes" className="underline underline-offset-4">
          Call Outcomes →
        </Link>
      </nav>
    </div>
  );
}
