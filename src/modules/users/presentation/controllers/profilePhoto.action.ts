"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  AdminRoleProtectedError,
  InvalidUserHierarchyError,
  updateProfilePhoto,
  UserNotFoundError,
} from "@/modules/users";
import { clientIp } from "../lib/clientIp";

export interface ProfilePhotoState {
  error?: string;
  success?: string;
}

export async function uploadProfilePhotoAction(
  userId: string,
  _state: ProfilePhotoState | undefined,
  formData: FormData,
): Promise<ProfilePhotoState> {
  const { session, authContext } = await requirePermission("user.manage");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await updateProfilePhoto({
      userId,
      organizationId: authContext.organizationId,
      file: {
        bytes,
        contentType: file.type || "image/jpeg",
        fileName: file.name,
      },
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
  revalidatePath("/users");
  return { success: "Profile photo updated." };
}

export async function removeProfilePhotoAction(userId: string): Promise<ProfilePhotoState> {
  const { session, authContext } = await requirePermission("user.manage");
  try {
    await updateProfilePhoto({
      userId,
      organizationId: authContext.organizationId,
      file: null,
      remove: true,
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
  revalidatePath("/users");
  return { success: "Profile photo removed." };
}
