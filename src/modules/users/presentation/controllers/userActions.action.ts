"use server";

import { headers } from "next/headers";
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

export interface ActionResult {
  error?: string;
  success?: string;
}

async function clientIp(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
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
      ? "enabled"
      : input.status === "SUSPENDED"
        ? "suspended"
        : "disabled";
  return { success: `User ${label}. Active sessions were terminated.` };
}

export async function enableUserAction(userId: string, reason?: string): Promise<ActionResult> {
  return changeUserStatusAction({ userId, status: "ACTIVE", reason, forceLogout: true });
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
  reassignCallersToTeamLeadId?: string | null,
): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.delete");
  try {
    await deleteUser({
      userId,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      reassignCallersToTeamLeadId: reassignCallersToTeamLeadId || null,
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

export async function bulkDeleteUsersAction(userIds: string[]): Promise<ActionResult> {
  const current = await requirePermission("user.delete");
  if (!hasPermission(current.authContext, "user.delete")) {
    return { error: "Not allowed." };
  }
  const parsed = bulkUserIdsSchema.safeParse({ userIds });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid selection." };

  try {
    const count = await bulkDeleteUsers({
      userIds: parsed.data.userIds,
      actorRoles: current.authContext.roles.map((role) => role.name),
      hierarchy: current.authContext.hierarchy,
      actor: { actorType: "USER", actorId: current.session.user.id },
    });
    revalidatePath("/users");
    return { success: `Deleted ${count} of ${parsed.data.userIds.length} user(s).` };
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
