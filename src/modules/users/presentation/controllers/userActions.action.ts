"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import type { UserStatus } from "@/modules/users";
import {
  AdminRoleProtectedError,
  bulkChangeAccountStatus,
  bulkDeleteUsers,
  bulkUserIdsSchema,
  CannotDeleteSelfError,
  changeAccountStatus,
  deleteUser,
  InvalidUserHierarchyError,
  LastActiveAdminError,
  resetPasswordSchema,
  resetUserPassword,
  UserDeleteBlockedError,
  UserNotFoundError,
} from "@/modules/users";
import { clientIp } from "../lib/clientIp";

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function resetPasswordAction(
  userId: string,
  _state: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.reset_password");
  if (session.user.id === userId) {
    return {
      error:
        "Admins cannot reset their own password here. Use Profile → Security → Change Password.",
    };
  }

  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  try {
    await resetUserPassword({
      userId,
      password: parsed.data.password,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      ipAddress: await clientIp(),
    });
  } catch (error) {
    if (
      error instanceof UserNotFoundError ||
      error instanceof AdminRoleProtectedError ||
      error instanceof InvalidUserHierarchyError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return {
    success:
      "Password reset. The employee must sign in and change their password. All sessions were ended.",
  };
}

export async function changeUserStatusAction(input: {
  userId: string;
  status: UserStatus;
  reason?: string;
  forceLogout?: boolean;
}): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.manage");
  try {
    await changeAccountStatus({
      userId: input.userId,
      status: input.status,
      reason: input.reason?.trim() || null,
      forceLogout: input.forceLogout ?? true,
      ipAddress: await clientIp(),
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof AdminRoleProtectedError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof LastActiveAdminError ||
      error instanceof UserNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/users");
  revalidatePath(`/users/${input.userId}`);
  const label =
    input.status === "ACTIVE"
      ? input.reason?.toLowerCase().includes("unsuspend")
        ? "unsuspended"
        : "enabled"
      : input.status === "SUSPENDED"
        ? "suspended"
        : "disabled";
  return { success: `User ${label}. Active sessions were terminated.` };
}

export async function enableUserAction(userId: string, reason?: string): Promise<ActionResult> {
  return changeUserStatusAction({ userId, status: "ACTIVE", reason, forceLogout: true });
}

/** Reactivate a Suspended account (same write path as Enable). */
export async function unsuspendUserAction(userId: string, reason?: string): Promise<ActionResult> {
  return changeUserStatusAction({
    userId,
    status: "ACTIVE",
    reason: reason?.trim() || "Unsuspended by administrator",
    forceLogout: true,
  });
}

export async function disableUserAction(
  userId: string,
  reason?: string,
  forceLogout = true,
): Promise<ActionResult> {
  return changeUserStatusAction({
    userId,
    status: "INACTIVE",
    reason,
    forceLogout,
  });
}

export async function suspendUserAction(userId: string, reason?: string): Promise<ActionResult> {
  return changeUserStatusAction({
    userId,
    status: "SUSPENDED",
    reason,
    forceLogout: true,
  });
}

export async function deleteUserAction(
  userId: string,
  options?: {
    reassignCallersToTeamLeadId?: string | null;
    reassignTeamLeadsToManagerId?: string | null;
    reassignLeadsToUserId?: string | null;
  } | string | null,
): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.delete");
  // Back-compat: second arg used to be reassignCallersToTeamLeadId string.
  const opts =
    typeof options === "string" || options === null || options === undefined
      ? { reassignCallersToTeamLeadId: options || null }
      : options;
  try {
    await deleteUser({
      userId,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      reassignCallersToTeamLeadId: opts.reassignCallersToTeamLeadId || null,
      reassignTeamLeadsToManagerId: opts.reassignTeamLeadsToManagerId || null,
      reassignLeadsToUserId: opts.reassignLeadsToUserId || null,
    });
  } catch (error) {
    if (
      error instanceof AdminRoleProtectedError ||
      error instanceof CannotDeleteSelfError ||
      error instanceof UserNotFoundError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof LastActiveAdminError ||
      error instanceof UserDeleteBlockedError
    ) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/users");
  return { success: "User deleted." };
}

export async function bulkDisableUsersAction(userIds: string[]): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.manage");
  const parsed = bulkUserIdsSchema.safeParse({ userIds });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid selection." };

  const count = await bulkChangeAccountStatus({
    userIds: parsed.data.userIds,
    status: "INACTIVE",
    forceLogout: true,
    ipAddress: await clientIp(),
    actorRoles: authContext.roles.map((role) => role.name),
    hierarchy: authContext.hierarchy,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/users");
  if (count === 0) {
    return { error: "No selected users could be disabled (hierarchy or last Admin protection)." };
  }
  return { success: `Disabled ${count} of ${parsed.data.userIds.length} user(s).` };
}

export async function bulkSuspendUsersAction(userIds: string[]): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.manage");
  const parsed = bulkUserIdsSchema.safeParse({ userIds });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid selection." };

  const count = await bulkChangeAccountStatus({
    userIds: parsed.data.userIds,
    status: "SUSPENDED",
    forceLogout: true,
    ipAddress: await clientIp(),
    actorRoles: authContext.roles.map((role) => role.name),
    hierarchy: authContext.hierarchy,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/users");
  if (count === 0) {
    return { error: "No selected users could be suspended (hierarchy or last Admin protection)." };
  }
  return { success: `Suspended ${count} of ${parsed.data.userIds.length} user(s).` };
}

export async function bulkEnableUsersAction(userIds: string[]): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.manage");
  const parsed = bulkUserIdsSchema.safeParse({ userIds });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid selection." };

  const count = await bulkChangeAccountStatus({
    userIds: parsed.data.userIds,
    status: "ACTIVE",
    forceLogout: true,
    ipAddress: await clientIp(),
    actorRoles: authContext.roles.map((role) => role.name),
    hierarchy: authContext.hierarchy,
    actor: { actorType: "USER", actorId: session.user.id },
  });
  revalidatePath("/users");
  if (count === 0) {
    return { error: "No selected users could be enabled." };
  }
  return { success: `Enabled ${count} of ${parsed.data.userIds.length} user(s).` };
}

export async function bulkDeleteUsersAction(input: {
  userIds: string[];
  reassignCallersToTeamLeadId?: string;
  reassignTeamLeadsToManagerId?: string;
  reassignLeadsToUserId?: string;
}): Promise<ActionResult & { details?: string[] }> {
  const current = await requirePermission("user.delete");
  if (!hasPermission(current.authContext, "user.delete")) {
    return { error: "Not allowed." };
  }
  const parsed = bulkUserIdsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid selection." };

  try {
    const { deleted, results } = await bulkDeleteUsers({
      userIds: parsed.data.userIds,
      actorRoles: current.authContext.roles.map((role) => role.name),
      hierarchy: current.authContext.hierarchy,
      actor: { actorType: "USER", actorId: current.session.user.id },
      reassignCallersToTeamLeadId: parsed.data.reassignCallersToTeamLeadId || null,
      reassignTeamLeadsToManagerId: parsed.data.reassignTeamLeadsToManagerId || null,
      reassignLeadsToUserId: parsed.data.reassignLeadsToUserId || null,
    });
    revalidatePath("/users");
    const failed = results.filter((row) => !row.ok);
    const details = failed.map(
      (row) => `${row.fullName ?? row.userId}: ${row.error ?? "Failed"}`,
    );
    return {
      success: `Deleted ${deleted} of ${parsed.data.userIds.length} user(s).${
        failed.length > 0 ? ` ${failed.length} failed.` : ""
      }`,
      details: details.length > 0 ? details : undefined,
    };
  } catch (error) {
    if (
      error instanceof AdminRoleProtectedError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof UserDeleteBlockedError ||
      error instanceof LastActiveAdminError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}
