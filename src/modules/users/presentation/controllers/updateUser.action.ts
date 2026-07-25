"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  AdminRoleProtectedError,
  DuplicateUserEmailError,
  DuplicateUserPhoneError,
  InvalidUserHierarchyError,
  LastActiveAdminError,
  updateUser,
  updateUserSchema,
  UserNotFoundError,
} from "@/modules/users";

export interface UserFormState {
  error?: string;
  success?: string;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateUserAction(
  userId: string,
  _previousState: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  const { session, authContext } = await requirePermission("user.manage");

  const parsed = updateUserSchema.safeParse({
    fullName: str(formData, "fullName") || undefined,
    email: str(formData, "email") || undefined,
    phone: str(formData, "phone") || undefined,
    role: str(formData, "role") || undefined,
    status: str(formData, "status") || undefined,
    profilePhotoUrl: str(formData, "profilePhotoUrl"),
    assignedTeamLeadId: str(formData, "assignedTeamLeadId"),
    reportingManagerId: str(formData, "reportingManagerId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateUser({
      userId,
      input: parsed.data,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (
      error instanceof DuplicateUserEmailError ||
      error instanceof DuplicateUserPhoneError ||
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
  revalidatePath(`/users/${userId}`);
  return { success: "User updated." };
}
