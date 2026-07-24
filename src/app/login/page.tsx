import { redirect } from "next/navigation";
import { auth } from "@/infra/auth";
import { LoginForm } from "@/modules/auth/presentation/components/LoginForm";
import { ThemeToggle } from "@/shared/ui/ThemeProvider";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;

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
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </section>
    </div>
  );
}
