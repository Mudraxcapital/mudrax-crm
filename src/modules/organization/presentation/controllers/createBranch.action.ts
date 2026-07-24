"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/createBranch.action.ts
//
// Server Action backing the "create Branch" form (BranchForm.tsx). RBAC
// enforcement happens here, at the entry point to the mutation —
// `requirePermission` redirects to /unauthorized for any User not holding
// `branch.manage` before the use-case ever runs. `organizationId` is always
// taken from the acting User's own Authorization Context, never from
// client-supplied input.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { createBranch, createBranchSchema, DuplicateBranchCodeError } from "@/modules/organization";

export interface BranchFormState {
  error?: string;
}

export async function createBranchAction(
  _previousState: BranchFormState | undefined,
  formData: FormData,
): Promise<BranchFormState> {
  const { session, authContext } = await requirePermission("branch.manage");

  const parsed = createBranchSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
    timezone: formData.get("timezone") || undefined,
    isArchived: formData.get("isArchived") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createBranch({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateBranchCodeError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/branches");
  redirect("/branches");
}
