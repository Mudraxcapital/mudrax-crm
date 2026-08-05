"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  AdminRoleProtectedError,
  createUser,
  createUserSchema,
  DuplicateUserEmailError,
  DuplicateUserPhoneError,
  InvalidUserHierarchyError,
  SingleAdminLimitError,
} from "@/modules/users";
import { formString } from "../lib/formData";

export interface UserFormState {
  error?: string;
}

export type CreateUserFormAction = (
  state: UserFormState | undefined,
  formData: FormData,
) => Promise<UserFormState>;

export async function createUserAction(
  _previousState: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  const { session, authContext } = await requirePermission("user.manage");

  const parsed = createUserSchema.safeParse({
    fullName: formString(formData, "fullName"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    password: formString(formData, "password"),
    role: formString(formData, "role"),
    status: formString(formData, "status") || "ACTIVE",
    profilePhotoUrl: formString(formData, "profilePhotoUrl"),
    assignedTeamLeadId: formString(formData, "assignedTeamLeadId"),
    reportingManagerId: formString(formData, "reportingManagerId"),
    canManageCallerAccounts: formData.get("canManageCallerAccounts") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let userId: string;
  try {
    const user = await createUser({
      input: parsed.data,
      actorRoles: authContext.roles.map((role) => role.name),
      hierarchy: authContext.hierarchy,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    userId = user.id;
  } catch (error) {
    if (
      error instanceof DuplicateUserEmailError ||
      error instanceof DuplicateUserPhoneError ||
      error instanceof AdminRoleProtectedError ||
      error instanceof InvalidUserHierarchyError ||
      error instanceof SingleAdminLimitError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/users");
  redirect(`/users/${userId}`);
}
