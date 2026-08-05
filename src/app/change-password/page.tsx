import { redirect } from "next/navigation";
import { requireAuth } from "@/infra/auth/session";
import { ChangePasswordForm } from "@/modules/auth/presentation/components/ChangePasswordForm";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { roleMaySelfServiceChangePassword } from "@/modules/users";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";

/**
 * Forced password-change gate for Managers, Team Leads, and Callers after
 * create / Admin reset. Voluntary changes use Profile → Security.
 */
export default async function ChangePasswordPage() {
  const { session, authContext } = await requireAuth();
  const role = authContext.hierarchy.primaryRole;
  const mustChange = !!session.user.mustChangePassword;

  if (!mustChange) {
    redirect(
      roleMaySelfServiceChangePassword(role) ? "/profile/security" : "/profile",
    );
  }

  return (
    <main className="bg-canvas flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader
          title="Change your password"
          description="Your administrator set a temporary password. Choose a new one before continuing."
        />
        <CardBody className="space-y-4">
          <ChangePasswordForm forced />
          <div className="border-border/60 flex items-center justify-between border-t pt-3">
            <p className="text-muted text-xs">Signed in as {session.user.email}</p>
            <LogoutButton />
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
