"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/updateBranch.action.ts
//
// Server Action backing the Branch edit page/form. RBAC enforcement happens
// here — `requirePermission` redirects to /unauthorized for any User not
// holding `branch.manage` before the use-case ever runs.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  updateBranch,
  updateBranchSchema,
  BranchNotFoundError,
  DuplicateBranchCodeError,
} from "@/modules/organization";
import type { BranchFormState } from "./createBranch.action";

export async function updateBranchAction(
  id: string,
  _previousState: BranchFormState | undefined,
  formData: FormData,
): Promise<BranchFormState> {
  const { session } = await requirePermission("branch.manage");

  const rawAddress = formData.get("address");
  const parsed = updateBranchSchema.safeParse({
    name: formData.get("name") || undefined,
    code: formData.get("code") || undefined,
    address: rawAddress === "" ? null : (rawAddress ?? undefined),
    timezone: formData.get("timezone") || undefined,
    isArchived: formData.get("isArchived") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateBranch({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateBranchCodeError) {
      return { error: error.message };
    }
    if (error instanceof BranchNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/branches");
  revalidatePath(`/branches/${id}/edit`);
  redirect("/branches");
}
