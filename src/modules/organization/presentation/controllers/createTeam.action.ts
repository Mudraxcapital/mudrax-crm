"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/createTeam.action.ts
//
// Server Action backing the "create Team" form (TeamForm.tsx). RBAC
// enforcement happens here — `requirePermission` redirects to /unauthorized
// for any User not holding `team.manage` before the use-case ever runs.
// `organizationId` is always taken from the acting User's own Authorization
// Context, never from client-supplied input.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createTeam,
  createTeamSchema,
  DuplicateTeamCodeError,
  InvalidBranchReferenceError,
} from "@/modules/organization";

export interface TeamFormState {
  error?: string;
}

export async function createTeamAction(
  _previousState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  const { session, authContext } = await requirePermission("team.manage");

  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    branchId: formData.get("branchId") || undefined,
    isArchived: formData.get("isArchived") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createTeam({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateTeamCodeError || error instanceof InvalidBranchReferenceError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/teams");
  redirect("/teams");
}
