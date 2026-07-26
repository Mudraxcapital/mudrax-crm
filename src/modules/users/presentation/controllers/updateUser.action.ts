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
  UserDeleteBlockedError,
  UserNotFoundError,
} from "@/modules/users";
import { formString } from "../lib/formData";

export interface UserFormState {
  error?: string;
  success?: string;
}

export async function updateUserAction(
  userId: string,
  _previousState: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  const { session, authContext } = await requirePermission("user.manage");

  const parsed = updateUserSchema.safeParse({
    fullName: formString(formData, "fullName") || undefined,
    email: formString(formData, "email") || undefined,
    phone: formString(formData, "phone") || undefined,
    role: formString(formData, "role") || undefined,
    status: formString(formData, "status") || undefined,
    profilePhotoUrl: formString(formData, "profilePhotoUrl"),
    assignedTeamLeadId: formString(formData, "assignedTeamLeadId"),
    reportingManagerId: formString(formData, "reportingManagerId"),
    reassignCallersToTeamLeadId: formString(formData, "reassignCallersToTeamLeadId"),
    reassignTeamLeadsToManagerId: formString(formData, "reassignTeamLeadsToManagerId"),
    reassignLeadsToUserId: formString(formData, "reassignLeadsToUserId"),
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
      error instanceof UserDeleteBlockedError ||
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
