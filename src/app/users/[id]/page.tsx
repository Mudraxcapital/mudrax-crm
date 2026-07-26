import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  AdminRoleProtectedError,
  countAssignedLeadsForUser,
  getUser,
  InvalidUserHierarchyError,
  listActiveUserSessions,
  listUserAuditLog,
  listUserLoginSessions,
  listUsers,
  listUsersByRole,
  listUserSessionHistory,
  UserNotFoundError,
} from "@/modules/users";
import {
  deleteUserAction,
  resetPasswordAction,
} from "@/modules/users/presentation/controllers/userActions.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Badge, accountStatusLabel, accountStatusTone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { UserDetailActions } from "./_components/UserDetailActions";
import { UserSessionsPanel } from "./_components/UserSessionsPanel";
import { ProfilePhotoForm } from "./_components/ProfilePhotoForm";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, authContext } = await requirePermission("user.view");
  const canManage = hasPermission(authContext, "user.manage");
  const canDelete = hasPermission(authContext, "user.delete");
  const canReset = hasPermission(authContext, "user.reset_password");
  const hierarchy = authContext.hierarchy;
  const visibleIds = hierarchy.visibleUserIds;

  let user;
  try {
    user = await getUser(id, {
      hierarchy,
      actorRoles: authContext.roles.map((role) => role.name),
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof UserNotFoundError) notFound();
    if (error instanceof InvalidUserHierarchyError || error instanceof AdminRoleProtectedError) {
      redirect("/unauthorized");
    }
    throw error;
  }

  // Reassignment pickers are only needed when the actor can delete.
  const loadDeleteOptions = canDelete;

  const [
    audit,
    loginAttempts,
    activeSessions,
    sessionHistory,
    callersUnderUser,
    teamLeadsUnderManager,
    teamLeads,
    managers,
    admins,
    hierarchyUsers,
    leadCount,
  ] = await Promise.all([
    listUserAuditLog(id, 40),
    listUserLoginSessions(id, 15),
    listActiveUserSessions(id),
    listUserSessionHistory(id, 30),
    loadDeleteOptions && user.roleName === "Team Lead"
      ? listUsers({ teamLeadId: id })
      : Promise.resolve([]),
    loadDeleteOptions && user.roleName === "Manager"
      ? listUsers({ reportingManagerId: id })
      : Promise.resolve([]),
    loadDeleteOptions ? listUsersByRole("Team Lead") : Promise.resolve([]),
    loadDeleteOptions ? listUsersByRole("Manager") : Promise.resolve([]),
    loadDeleteOptions ? listUsersByRole("Admin") : Promise.resolve([]),
    loadDeleteOptions
      ? listUsers({ userIds: visibleIds ?? undefined })
      : Promise.resolve([]),
    loadDeleteOptions ? countAssignedLeadsForUser(id) : Promise.resolve(0),
  ]);

  const scopedTeamLeads = teamLeads.filter(
    (lead) => !visibleIds || visibleIds.includes(lead.id),
  );
  const scopedManagers = hierarchy.unrestricted
    ? [...managers, ...admins]
    : managers.filter(
        (item) => item.id === hierarchy.ownerManagerId || item.id === authContext.userId,
      );

  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const photoSrc = user.profilePhotoUrl
    ? user.profilePhotoUrl.startsWith("storage:")
      ? `/api/users/${user.id}/photo`
      : user.profilePhotoUrl
    : null;

  const failedAttempts = loginAttempts.filter((attempt) => !attempt.succeeded);

  return (
    <PageSection>
      <PageHeader
        title={user.fullName}
        description={`${user.employeeId} · ${user.roleName ?? "No role"}`}
        breadcrumbs={[
          { label: "User Management", href: "/users" },
          { label: user.fullName },
        ]}
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge tone={accountStatusTone(user.displayStatus)} dot>
              {accountStatusLabel(user.displayStatus)}
            </Badge>
            {user.mustChangePassword ? (
              <Badge tone="warning">Password change required</Badge>
            ) : null}
          </div>
        }
        actions={
          <>
            {canManage ? (
              <Link href={`/users/${user.id}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
            ) : null}
            <UserDetailActions
              userId={user.id}
              status={user.status}
              roleName={user.roleName}
              canManage={canManage}
              canDelete={canDelete}
              canReset={canReset}
              isSelf={session.user.id === user.id}
              callerCount={callersUnderUser.length}
              teamLeadCount={teamLeadsUnderManager.length}
              leadCount={leadCount}
              teamLeadOptions={scopedTeamLeads.map((lead) => ({
                id: lead.id,
                fullName: lead.fullName,
                employeeId: lead.employeeId,
              }))}
              managerOptions={scopedManagers.map((manager) => ({
                id: manager.id,
                fullName: manager.fullName,
                employeeId: manager.employeeId,
              }))}
              leadAssigneeOptions={hierarchyUsers
                .filter((item) => item.status === "ACTIVE")
                .map((item) => ({
                  id: item.id,
                  fullName: item.fullName,
                  roleName: item.roleName,
                }))}
              deleteAction={deleteUserAction}
              resetPasswordAction={resetPasswordAction}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Employee information" />
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              {photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoSrc} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <div className="bg-accent/15 text-accent flex size-12 items-center justify-center rounded-full text-sm font-semibold">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-muted text-xs">{user.roleName ?? "No role"}</p>
              </div>
            </div>
            {canManage ? (
              <ProfilePhotoForm userId={user.id} hasPhoto={!!user.profilePhotoUrl} />
            ) : null}
            <Row label="Employee ID" value={user.employeeId} />
            <Row label="Email" value={user.email} />
            <Row label="Phone" value={user.phone ?? "—"} />
            <Row label="Role" value={user.roleName ?? "—"} />
            <Row label="Account status" value={accountStatusLabel(user.displayStatus)} />
            {user.lockedReason ? <Row label="Lock reason" value={user.lockedReason} /> : null}
            <Row
              label="Last login"
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
            />
            <Row label="Created" value={new Date(user.createdAt).toLocaleString()} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Reporting hierarchy"
            description="Admin → Manager → Team Lead → Caller"
          />
          <CardBody className="space-y-2 text-sm">
            <Row label="Reporting manager" value={user.reportingManagerName ?? "—"} />
            <Row
              label="Assigned team lead"
              value={
                user.roleName === "Caller" ? (user.assignedTeamLeadName ?? "—") : "—"
              }
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Sessions"
            description="Active devices and login history for this employee."
          />
          <CardBody>
            <UserSessionsPanel
              userId={user.id}
              activeSessions={activeSessions}
              history={sessionHistory}
              canManage={canManage}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Failed login attempts"
            description="Recent unsuccessful sign-in tries."
          />
          <CardBody>
            {failedAttempts.length === 0 ? (
              <p className="text-muted text-sm">No failed attempts recorded.</p>
            ) : (
              <ul className="space-y-2">
                {failedAttempts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{attempt.failureReason ?? "Failed"}</p>
                      <p className="text-muted text-xs">
                        IP {attempt.ipAddress ?? "unknown"}
                      </p>
                    </div>
                    <time className="text-muted text-xs">
                      {new Date(attempt.occurredAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Audit log"
            description="Actor, action, old/new values, IP, and timestamp."
          />
          <CardBody>
            {audit.length === 0 ? (
              <p className="text-muted text-sm">No audit events yet.</p>
            ) : (
              <ul className="space-y-2">
                {audit.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{entry.action}</p>
                      <time className="text-muted text-xs">
                        {new Date(entry.occurredAt).toLocaleString()}
                      </time>
                    </div>
                    <p className="text-muted text-xs">
                      Actor {entry.actorName ?? entry.actorType}
                      {entry.ipAddress ? ` · IP ${entry.ipAddress}` : ""}
                    </p>
                    {(entry.beforeState || entry.afterState) && (
                      <p className="text-muted mt-1 text-xs break-all">
                        {entry.beforeState
                          ? `Old: ${summarizeState(entry.beforeState)}`
                          : null}
                        {entry.beforeState && entry.afterState ? " → " : null}
                        {entry.afterState
                          ? `New: ${summarizeState(entry.afterState)}`
                          : null}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function summarizeState(state: Record<string, unknown>): string {
  const keys = ["status", "role", "email", "phone", "fullName", "mustChangePassword", "lockedUntil"];
  const parts: string[] = [];
  for (const key of keys) {
    if (state[key] !== undefined && state[key] !== null) {
      parts.push(`${key}=${String(state[key])}`);
    }
  }
  if (parts.length === 0) {
    return JSON.stringify(state).slice(0, 120);
  }
  return parts.join(", ");
}
