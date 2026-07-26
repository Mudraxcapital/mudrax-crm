"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
  revokeAllUserSessions,
  revokeUserSession,
  UserNotFoundError,
} from "@/modules/users";
import { clientIp } from "../lib/clientIp";

export interface ActionResult {
  error?: string;
  success?: string;
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
