"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/updateTeam.action.ts
//
// Server Action backing the Team edit page/form. RBAC enforcement happens
// here — `requirePermission` redirects to /unauthorized for any User not
// holding `team.manage` before the use-case ever runs.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  updateTeam,
  updateTeamSchema,
  DuplicateTeamCodeError,
  InvalidBranchReferenceError,
  TeamNotFoundError,
} from "@/modules/organization";
import type { TeamFormState } from "./createTeam.action";

export async function updateTeamAction(
  id: string,
  _previousState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  const { session } = await requirePermission("team.manage");

  const rawBranchId = formData.get("branchId");
  const parsed = updateTeamSchema.safeParse({
    name: formData.get("name") || undefined,
    code: formData.get("code") || undefined,
    branchId: rawBranchId === "" ? null : (rawBranchId ?? undefined),
    isArchived: formData.get("isArchived") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateTeam({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateTeamCodeError || error instanceof InvalidBranchReferenceError) {
      return { error: error.message };
    }
    if (error instanceof TeamNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/teams");
  revalidatePath(`/teams/${id}/edit`);
  redirect("/teams");
}
