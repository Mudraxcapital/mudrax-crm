"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth } from "@/infra/auth/session";
import { signOut } from "@/infra/auth";
import {
  changeOwnPassword,
  changeOwnPasswordSchema,
  InvalidUserHierarchyError,
} from "@/modules/users";

export interface ChangePasswordState {
  error?: string;
}

async function clientIp(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * Self-service change password — authenticated user, own account only.
 * Used by Profile → Security and the forced /change-password gate.
 */
export async function changePasswordAction(
  _state: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const { session } = await requireAuth();

  const parsed = changeOwnPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  try {
    await changeOwnPassword({
      userId: session.user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      ipAddress: await clientIp(),
    });
  } catch (error) {
    if (error instanceof InvalidUserHierarchyError) {
      return { error: error.message };
    }
    throw error;
  }

  // Invalidate cookie session after server-side sessionVersion bump + revoke-all.
  await signOut({ redirect: false });
  redirect("/login?passwordChanged=1");
}
