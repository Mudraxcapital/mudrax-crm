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
} from "@/modules/users";

export interface UserFormState {
  error?: string;
}

export type CreateUserFormAction = (
  state: UserFormState | undefined,
  formData: FormData,
) => Promise<UserFormState>;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createUserAction(
  _previousState: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  const { session, authContext } = await requirePermission("user.manage");

  const parsed = createUserSchema.safeParse({
    fullName: str(formData, "fullName"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    password: str(formData, "password"),
    role: str(formData, "role"),
    status: str(formData, "status") || "ACTIVE",
    profilePhotoUrl: str(formData, "profilePhotoUrl"),
    assignedTeamLeadId: str(formData, "assignedTeamLeadId"),
    reportingManagerId: str(formData, "reportingManagerId"),
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
      error instanceof InvalidUserHierarchyError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/users");
  redirect(`/users/${userId}`);
}
