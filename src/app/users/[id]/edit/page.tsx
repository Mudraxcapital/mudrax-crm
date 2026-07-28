import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasRole } from "@/modules/rbac";
import {
  AdminRoleProtectedError,
  countAssignedLeadsForUser,
  getUser,
  InvalidUserHierarchyError,
  listUsers,
  listUsersByRole,
  UserNotFoundError,
} from "@/modules/users";
import { rolesActorMayCreate } from "@/modules/users/application/services/userHierarchyPolicy";
import { EditUserForm } from "@/modules/users/presentation/components/EditUserForm";
import { updateUserAction } from "@/modules/users/presentation/controllers/updateUser.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, authContext } = await requirePermission("user.manage");
  const allowAdminRole = hasRole(authContext, "Admin");
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

  const creatableRoles = rolesActorMayCreate(
    authContext.roles.map((role) => role.name),
    hierarchy,
  );
  const allowedRoles = Array.from(
    new Set<string>([...creatableRoles, ...(user.roleName ? [user.roleName] : [])]),
  );

  const [
    teamLeads,
    managers,
    admins,
    callersUnderUser,
    teamLeadsUnderManager,
    hierarchyUsers,
    leadCount,
  ] = await Promise.all([
    listUsersByRole("Team Lead"),
    listUsersByRole("Manager"),
    listUsersByRole("Admin"),
    user.roleName === "Team Lead" ? listUsers({ teamLeadId: id }) : Promise.resolve([]),
    user.roleName === "Manager" ? listUsers({ reportingManagerId: id }) : Promise.resolve([]),
    listUsers({ userIds: visibleIds ?? undefined }),
    countAssignedLeadsForUser(id),
  ]);

  const scopedTeamLeads = teamLeads.filter(
    (item) => !visibleIds || visibleIds.includes(item.id),
  );
  const scopedManagers = hierarchy.unrestricted
    ? [...managers, ...admins]
    : managers.filter(
        (item) => item.id === hierarchy.ownerManagerId || item.id === authContext.userId,
      );

  const boundUpdate = updateUserAction.bind(null, id);
  const isSelf = session.user.id === id;

  return (
    <PageSection>
      <PageHeader
        title={`Edit ${user.fullName}`}
        description={
          isSelf
            ? "Update your contact details. Role, status, and hierarchy cannot be changed here."
            : "Update employee details, role, account status, and reporting line."
        }
        breadcrumbs={[
          { label: "User Management", href: "/users" },
          { label: user.fullName, href: `/users/${user.id}` },
          { label: "Edit" },
        ]}
      />
      <Card>
        <CardBody>
          <EditUserForm
            user={user}
            action={boundUpdate}
            allowAdminRole={allowAdminRole}
            allowGrantCallerLifecycle={
              allowAdminRole || authContext.hierarchy.primaryRole === "Manager"
            }
            allowedRoles={allowedRoles}
            isSelf={isSelf}
            callerCount={callersUnderUser.length}
            teamLeadCount={teamLeadsUnderManager.length}
            leadCount={leadCount}
            teamLeads={scopedTeamLeads.map((item) => ({
              id: item.id,
              fullName: item.fullName,
              employeeId: item.employeeId,
            }))}
            managers={scopedManagers.map((item) => ({
              id: item.id,
              fullName: item.fullName,
              employeeId: item.employeeId,
            }))}
            leadAssigneeOptions={hierarchyUsers
              .filter((item) => item.status === "ACTIVE" && item.id !== id)
              .map((item) => ({
                id: item.id,
                fullName: item.fullName,
                roleName: item.roleName,
              }))}
          />
        </CardBody>
      </Card>
    </PageSection>
  );
}
