"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
  revokeAllUserSessions,
  revokeUserSession,
  unlockUser,
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

export async function revokeSessionAction(
  userId: string,
  sessionId: string,
): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.manage");
  try {
    await revokeUserSession({
      userId,
      sessionId,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      ipAddress: await clientIp(),
    });
  } catch (error) {
    if (
      error instanceof UserNotFoundError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof AdminRoleProtectedError
    ) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath(`/users/${userId}`);
  return { success: "Session logged out." };
}

export async function revokeAllSessionsAction(userId: string): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.manage");
  try {
    const count = await revokeAllUserSessions({
      userId,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      ipAddress: await clientIp(),
    });
    revalidatePath(`/users/${userId}`);
    return { success: `Logged out ${count} session(s).` };
  } catch (error) {
    if (
      error instanceof UserNotFoundError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof AdminRoleProtectedError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function unlockUserAction(userId: string): Promise<ActionResult> {
  const { session, authContext } = await requirePermission("user.manage");
  try {
    await unlockUser({
      userId,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      ipAddress: await clientIp(),
    });
  } catch (error) {
    if (
      error instanceof UserNotFoundError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof AdminRoleProtectedError
    ) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return { success: "Account unlocked." };
}
