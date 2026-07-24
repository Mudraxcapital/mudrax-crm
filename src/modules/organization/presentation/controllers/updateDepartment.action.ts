"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/updateDepartment.action.ts
//
// Server Action backing the Department edit page/form. RBAC enforcement
// happens here — `requirePermission` redirects to /unauthorized for any
// User not holding `department.manage` before the use-case ever runs.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  updateDepartment,
  updateDepartmentSchema,
  DepartmentNotFoundError,
  DuplicateDepartmentCodeError,
} from "@/modules/organization";
import type { DepartmentFormState } from "./createDepartment.action";

export async function updateDepartmentAction(
  id: string,
  _previousState: DepartmentFormState | undefined,
  formData: FormData,
): Promise<DepartmentFormState> {
  const { session } = await requirePermission("department.manage");

  const parsed = updateDepartmentSchema.safeParse({
    name: formData.get("name") || undefined,
    code: formData.get("code") || undefined,
    isArchived: formData.get("isArchived") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateDepartment({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateDepartmentCodeError) {
      return { error: error.message };
    }
    if (error instanceof DepartmentNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/departments");
  revalidatePath(`/departments/${id}/edit`);
  redirect("/departments");
}
