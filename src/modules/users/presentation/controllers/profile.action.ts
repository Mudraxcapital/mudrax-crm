"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/infra/auth/session";
import {
  DuplicateUserPhoneError,
  InvalidUserHierarchyError,
  updateOwnProfile,
  updateOwnProfileSchema,
  updateProfilePhoto,
  UserNotFoundError,
} from "@/modules/users";
import { clientIp } from "../lib/clientIp";

export interface ProfileFormState {
  error?: string;
  success?: string;
}

export async function updateOwnProfileAction(
  _state: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const { session } = await requireAuth();
  const parsed = updateOwnProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateOwnProfile({
      userId: session.user.id,
      data: parsed.data,
    });
  } catch (error) {
    if (error instanceof DuplicateUserPhoneError || error instanceof UserNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/profile");
  revalidatePath("/caller/profile");
  return { success: "Profile updated." };
}

export async function uploadOwnProfilePhotoAction(
  _state: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const { session, authContext } = await requireAuth();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await updateProfilePhoto({
      userId: session.user.id,
      organizationId: authContext.organizationId,
      file: {
        bytes,
        contentType: file.type || "image/jpeg",
        fileName: file.name,
      },
      selfService: true,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      ipAddress: await clientIp(),
    });
  } catch (error) {
    if (
      error instanceof UserNotFoundError ||
      error instanceof InvalidUserHierarchyError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/profile");
  revalidatePath("/caller/profile");
  revalidatePath("/users");
  return { success: "Profile photo updated." };
}

export async function removeOwnProfilePhotoAction(): Promise<ProfileFormState> {
  const { session, authContext } = await requireAuth();
  try {
    await updateProfilePhoto({
      userId: session.user.id,
      organizationId: authContext.organizationId,
      file: null,
      remove: true,
      selfService: true,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
      ipAddress: await clientIp(),
    });
  } catch (error) {
    if (
      error instanceof UserNotFoundError ||
      error instanceof InvalidUserHierarchyError
    ) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/profile");
  revalidatePath("/caller/profile");
  revalidatePath("/users");
  return { success: "Profile photo removed." };
}
