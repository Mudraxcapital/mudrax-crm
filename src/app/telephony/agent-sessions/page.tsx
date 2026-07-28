import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listUserSummaries } from "@/modules/users";
import { getActiveAgentSession, listAgentSessions } from "@/modules/telephony";
import {
  ChangeAgentStatusForm,
  EndAgentSessionForm,
  StartAgentSessionForm,
} from "@/modules/telephony/presentation/components/AgentSessionControls";
import { startAgentSessionAction } from "@/modules/telephony/presentation/controllers/startAgentSession.action";
import { changeAgentSessionStatusAction } from "@/modules/telephony/presentation/controllers/changeAgentSessionStatus.action";
import { endAgentSessionAction } from "@/modules/telephony/presentation/controllers/endAgentSession.action";
import { TabNav } from "@/shared/ui/Tabs";
import { telephonyTabItems } from "../_lib/telephonyTabs";

export default async function TelephonyAgentSessionsPage() {
  const { session, authContext } = await requireAuth();

  const canSelf = hasPermission(authContext, "agent_session.self");
  const canManage = hasPermission(authContext, "agent_session.manage");

  if (!canSelf && !canManage) {
    redirect("/unauthorized");
  }

  const [activeSession, allSessionsRaw, users] = await Promise.all([
    canSelf ? getActiveAgentSession(session.user.id) : Promise.resolve(null),
    canManage ? listAgentSessions(authContext.organizationId, { limit: 50 }) : Promise.resolve([]),
    canManage ? listUserSummaries(authContext.organizationId) : Promise.resolve([]),
  ]);

  const hierarchy = authContext.hierarchy;
  const allSessions =
    hierarchy.unrestricted || hierarchy.primaryRole === "Admin"
      ? allSessionsRaw
      : allSessionsRaw.filter((item) =>
          (hierarchy.visibleUserIds ?? [session.user.id]).includes(item.userId),
        );
  const visibleUserSet = new Set(hierarchy.visibleUserIds ?? []);
  const scopedUsers =
    hierarchy.unrestricted || hierarchy.primaryRole === "Admin"
      ? users
      : users.filter((user) => visibleUserSet.has(user.id) || user.id === session.user.id);

  const userNameById = new Map(scopedUsers.map((user) => [user.id, user.fullName]));

  return (
    <div className="mx-page flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Agent Sessions</h1>
        <p className="text-muted mt-1 text-sm">
          {canManage
            ? "Login/logout and availability tracking for Agents."
            : "Your login/logout and availability status."}
        </p>
      </div>

      <TabNav activeHref="/telephony/agent-sessions" items={telephonyTabItems(authContext)} />

      {canSelf ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">My Session</h2>
          <div className="mt-4">
            {activeSession ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm">
                  Status: <span className="font-medium">{activeSession.status}</span> · Logged in{" "}
                  {new Date(activeSession.loginAt).toLocaleString()}
                </p>
                <ChangeAgentStatusForm
                  action={changeAgentSessionStatusAction.bind(null, activeSession.id)}
                  currentStatus={activeSession.status}
                />
                <EndAgentSessionForm action={endAgentSessionAction.bind(null, activeSession.id)} />
              </div>
            ) : (
              <StartAgentSessionForm action={startAgentSessionAction} />
            )}
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="mx-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 ">
            <h2 className="text-sm font-medium">All Agent Sessions</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Login</th>
                <th className="px-4 py-3 font-medium">Logout</th>
              </tr>
            </thead>
            <tbody>
              {allSessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted px-4 py-6 text-center">
                    No Agent Sessions yet.
                  </td>
                </tr>
              ) : (
                allSessions.map((agentSession) => (
                  <tr
                    key={agentSession.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      {userNameById.get(agentSession.userId) ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">{agentSession.status}</td>
                    <td className="px-4 py-3">{new Date(agentSession.loginAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {agentSession.logoutAt
                        ? new Date(agentSession.logoutAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      {!canManage ? (
        <p className="text-muted text-sm">
          <Link href="/telephony/calls" className="text-accent hover:underline underline-offset-4">
            ← Back to my calls
          </Link>
        </p>
      ) : null}
    </div>
  );
}
