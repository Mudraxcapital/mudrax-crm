import { redirect } from "next/navigation";
import { auth } from "@/infra/auth";
import { LoginForm } from "@/modules/auth/presentation/components/LoginForm";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold">Mudrax CRM</h1>
          <p className="text-foreground/60 mt-1 text-sm">Sign in to your account</p>
        </div>
        <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
