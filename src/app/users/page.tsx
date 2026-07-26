import { requirePermission } from "@/infra/auth/session";
import { FIXED_ROLES, hasPermission, hasRole } from "@/modules/rbac";
import { listUsers, listUsersByRole } from "@/modules/users";
import { rolesActorMayCreate } from "@/modules/users/application/services/userHierarchyPolicy";
import { UserForm } from "@/modules/users/presentation/components/UserForm";
import { createUserAction } from "@/modules/users/presentation/controllers/createUser.action";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { CreatePanel } from "../_components/CreatePanel";
import { UsersTable } from "./_components/UsersTable";

export default async function UsersPage() {
  const { session, authContext } = await requirePermission("user.view");
  const canManage = hasPermission(authContext, "user.manage");
  const canDelete = hasPermission(authContext, "user.delete");
  const canReset = hasPermission(authContext, "user.reset_password");
  const allowAdminRole = hasRole(authContext, "Admin");
  const hierarchy = authContext.hierarchy;
  const visibleIds = hierarchy.visibleUserIds;

  const creatableRoles = rolesActorMayCreate(
    authContext.roles.map((role) => role.name),
    hierarchy,
  );

  const [users, teamLeads, managers, admins] = await Promise.all([
    listUsers({ userIds: visibleIds ?? undefined }),
    listUsersByRole("Team Lead"),
    listUsersByRole("Manager"),
    listUsersByRole("Admin"),
  ]);

  const scopedTeamLeads = teamLeads.filter(
    (user) => !visibleIds || visibleIds.includes(user.id),
  );
  const scopedManagers = hierarchy.unrestricted
    ? managers
    : managers.filter(
        (user) => user.id === hierarchy.ownerManagerId || user.id === authContext.userId,
      );
  const managerPicker = hierarchy.unrestricted ? [...managers, ...admins] : scopedManagers;

  return (
    <PageSection>
      <PageHeader
        title="User Management"
        description="Create employees, assign roles in the Admin → Manager → Team Lead → Caller hierarchy (plus Direct Admin Callers for freelancers), and manage account status."
        breadcrumbs={[{ label: "User Management" }]}
        actions={
          <>
            {(allowAdminRole || hierarchy.primaryRole === "Manager") ? (
              <div className="flex flex-wrap gap-2">
                <a href="/api/users/export?format=csv" className="mx-btn mx-btn-secondary">
                  Export CSV
                </a>
                <a href="/api/users/export?format=excel" className="mx-btn mx-btn-secondary">
                  Export Excel
                </a>
              </div>
            ) : null}
            {canManage && creatableRoles.length > 0 ? (
              <CreatePanel
                triggerLabel="Add employee"
                title="Add employee"
                description="Team Leads need a Manager; Callers need a Team Lead, or Admin may assign Direct Admin (freelancer). An employee ID is generated automatically for support use."
                width="lg"
              >
                <UserForm
                  action={createUserAction}
                  allowAdminRole={allowAdminRole}
                  allowedRoles={creatableRoles}
                  teamLeads={scopedTeamLeads.map((user) => ({
                    id: user.id,
                    fullName: user.fullName,
                    employeeId: user.employeeId,
                  }))}
                  managers={managerPicker.map((user) => ({
                    id: user.id,
                    fullName: user.fullName,
                    employeeId: user.employeeId,
                  }))}
                  defaultReportingManagerId={
                    hierarchy.primaryRole === "Manager" ? authContext.userId : undefined
                  }
                  defaultAssignedTeamLeadId={
                    hierarchy.primaryRole === "Team Lead" ? authContext.userId : undefined
                  }
                />
              </CreatePanel>
            ) : null}
          </>
        }
      />

      <UsersTable
        currentUserId={session.user.id}
        canManage={canManage}
        canDelete={canDelete}
        canReset={canReset}
        roleFilterOptions={[...FIXED_ROLES].filter(
          (role) =>
            hierarchy.unrestricted ||
            creatableRoles.includes(role) ||
            role === hierarchy.primaryRole,
        )}
        teamLeadOptions={scopedTeamLeads.map((user) => ({
          id: user.id,
          fullName: user.fullName,
        }))}
        managerOptions={managerPicker.map((user) => ({
          id: user.id,
          fullName: user.fullName,
        }))}
        leadAssigneeOptions={users
          .filter((user) => user.status === "ACTIVE")
          .map((user) => ({
            id: user.id,
            fullName: user.fullName,
            roleName: user.roleName,
          }))}
        rows={users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          employeeId: user.employeeId,
          email: user.email,
          phone: user.phone,
          roleName: user.roleName,
          status: user.status,
          displayStatus: user.displayStatus,
          assignedTeamLeadId: user.assignedTeamLeadId,
          assignedTeamLeadName: user.assignedTeamLeadName,
          reportingManagerId: user.reportingManagerId,
          reportingManagerName: user.reportingManagerName,
          lastLoginAt: user.lastLoginAt,
          profilePhotoUrl: user.profilePhotoUrl,
        }))}
      />
    </PageSection>
  );
}
