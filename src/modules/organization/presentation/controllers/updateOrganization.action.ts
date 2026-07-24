"use server";

// ============================================================================
// src/modules/organization/presentation/controllers/updateOrganization.action.ts
//
// Server Action backing the Organization edit page/form. RBAC enforcement
// happens here, at the entry point to the mutation — `requirePermission`
// redirects to /unauthorized for any User not holding `organization.manage`
// before the use-case ever runs.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  updateOrganization,
  updateOrganizationSchema,
  DuplicateOrganizationCodeError,
  OrganizationNotFoundError,
} from "@/modules/organization";
import type { OrganizationFormState } from "./createOrganization.action";

export async function updateOrganizationAction(
  id: string,
  _previousState: OrganizationFormState | undefined,
  formData: FormData,
): Promise<OrganizationFormState> {
  const { session } = await requirePermission("organization.manage");

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name") || undefined,
    code: formData.get("code") || undefined,
    timezone: formData.get("timezone") || undefined,
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateOrganization({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof DuplicateOrganizationCodeError) {
      return { error: error.message };
    }
    if (error instanceof OrganizationNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/organizations");
  revalidatePath(`/organizations/${id}/edit`);
  redirect("/organizations");
}
