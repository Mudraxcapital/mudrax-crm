"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/createOrganization.action.ts
//
// Server Action backing the "create Organization" form
// (OrganizationForm.tsx). RBAC enforcement happens here, at the entry point
// to the mutation — `requirePermission` redirects to /unauthorized for any
// User not holding `organization.manage` before the use-case ever runs.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createOrganization,
  createOrganizationSchema,
  DuplicateOrganizationCodeError,
} from "@/modules/organization";

export interface OrganizationFormState {
  error?: string;
}

export async function createOrganizationAction(
  _previousState: OrganizationFormState | undefined,
  formData: FormData,
): Promise<OrganizationFormState> {
  const { session } = await requirePermission("organization.manage");

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    timezone: formData.get("timezone") || undefined,
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createOrganization({
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateOrganizationCodeError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/organizations");
  redirect("/organizations");
}
