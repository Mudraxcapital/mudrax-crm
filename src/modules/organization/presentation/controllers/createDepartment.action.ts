"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/createDepartment.action.ts
//
// Server Action backing the "create Department" form (DepartmentForm.tsx).
// RBAC enforcement happens here — `requirePermission` redirects to
// /unauthorized for any User not holding `department.manage` before the
// use-case ever runs. `organizationId` is always taken from the acting
// User's own Authorization Context, never from client-supplied input.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createDepartment,
  createDepartmentSchema,
  DuplicateDepartmentCodeError,
} from "@/modules/organization";

export interface DepartmentFormState {
  error?: string;
}

export async function createDepartmentAction(
  _previousState: DepartmentFormState | undefined,
  formData: FormData,
): Promise<DepartmentFormState> {
  const { session, authContext } = await requirePermission("department.manage");

  const parsed = createDepartmentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    isArchived: formData.get("isArchived") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createDepartment({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateDepartmentCodeError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/departments");
  redirect("/departments");
}
