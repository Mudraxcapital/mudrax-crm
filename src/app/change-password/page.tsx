import { redirect } from "next/navigation";
import { requireAuth } from "@/infra/auth/session";
import { roleMaySelfServiceChangePassword } from "@/modules/users";

/**
 * Legacy forced password-change route. First-login / reset no longer force a
 * change — Admins use Profile → Security; everyone else is Admin-managed.
 */
export default async function ChangePasswordPage() {
  const { authContext } = await requireAuth();
  redirect(
    roleMaySelfServiceChangePassword(authContext.hierarchy.primaryRole)
      ? "/profile/security"
      : "/profile",
  );
}
