import { redirect } from "next/navigation";
import { auth } from "@/infra/auth";
import { CLEAR_STALE_SESSION_PATH, getCurrentUser } from "@/infra/auth/session";
import { LoginForm } from "@/modules/auth/presentation/components/LoginForm";
import { ThemeToggle } from "@/shared/ui/ThemeProvider";

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    reason?: string;
    passwordChanged?: string;
  }>;
}

const ACCOUNT_DISABLED_BANNER =
  "Your account has been disabled. Please contact your administrator.";
const ACCOUNT_LOCKED_BANNER =
  "Your account is temporarily locked after too many failed sign-in attempts. Contact an administrator to unlock, or try again later.";
const PASSWORD_CHANGED_BANNER =
  "Password updated. Sign in with your new password.";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Only bounce home when the JWT still maps to a live staff user.
  // Orphaned JWTs (e.g. after a user reseed) are cleared via a Route Handler —
  // Server Components cannot mutate cookies.
  const current = await getCurrentUser();
  if (current) {
    redirect("/");
  }

  const session = await auth();
  if (session?.user?.id) {
    redirect(CLEAR_STALE_SESSION_PATH);
  }

  const { callbackUrl, reason, passwordChanged } = await searchParams;
  const initialError =
    reason === "disabled" || reason === "suspended"
      ? ACCOUNT_DISABLED_BANNER
      : reason === "locked"
        ? ACCOUNT_LOCKED_BANNER
        : passwordChanged === "1"
          ? PASSWORD_CHANGED_BANNER
          : undefined;

  return (
    <div className="relative flex min-h-screen">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 10% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent), radial-gradient(900px 500px at 100% 0%, color-mix(in srgb, var(--info) 12%, transparent), transparent), var(--background)",
        }}
      />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <section className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-xl text-sm font-bold">
            M
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Mudrax CRM</p>
            <p className="text-sidebar-muted text-xs">Mudrax Capitals</p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Enterprise loan DSA operations, designed for speed.
          </h1>
          <p className="text-sidebar-muted text-sm leading-relaxed">
            Manage customers, leads, campaigns, telephony, documents, and disbursements in one
            polished workspace.
          </p>
        </div>
        <p className="text-sidebar-muted text-xs">Secure access · Role-based permissions</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="mx-page w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="bg-accent text-accent-foreground mb-4 flex size-10 items-center justify-center rounded-xl text-sm font-bold">
              M
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Mudrax CRM</h1>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-muted mt-1 text-sm">Sign in to continue to your workspace.</p>
          </div>
          <div className="mx-card p-6 sm:p-7">
            <LoginForm callbackUrl={callbackUrl} initialError={initialError} />
          </div>
        </div>
      </section>
    </div>
  );
}
