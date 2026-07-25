import { redirect } from "next/navigation";
import { requireAuth } from "@/infra/auth/session";
import { ChangePasswordForm } from "@/modules/auth/presentation/components/ChangePasswordForm";

/**
 * Forced password-change gate after Admin reset or first login of a new user.
 * Voluntary changes use Profile → Security → Change Password.
 */
export default async function ChangePasswordPage() {
  const { session } = await requireAuth();
  if (!session.user.mustChangePassword) {
    redirect("/profile/security");
  }

  return (
    <main className="bg-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="border-border bg-surface w-full max-w-md rounded-xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Change password</h1>
        <p className="text-muted mt-2 text-sm">
          Your account requires a new password before you can continue. Enter your temporary
          password, then choose a new one.
        </p>
        <div className="mt-6">
          <ChangePasswordForm forced />
        </div>
      </div>
    </main>
  );
}
