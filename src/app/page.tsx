import Link from "next/link";
import { requireAuth } from "@/infra/auth/session";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";

export default async function Home() {
  const { session, authContext } = await requireAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Mudrax CRM</h1>
          <p className="text-foreground/60 text-sm">Authentication &amp; RBAC foundation</p>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-foreground/60 text-sm font-medium">Signed in as</h2>
        <p className="mt-1 text-lg font-medium">{session.user.fullName}</p>
        <p className="text-foreground/60 text-sm">{session.user.email}</p>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-foreground/60">Organization ID</dt>
          <dd className="font-mono text-xs">{session.user.organizationId}</dd>
          <dt className="text-foreground/60">Roles</dt>
          <dd>{authContext.roles.map((role) => role.name).join(", ") || "None"}</dd>
          <dt className="text-foreground/60">Branch</dt>
          <dd className="font-mono text-xs">{authContext.scope.branchId ?? "—"}</dd>
          <dt className="text-foreground/60">Team</dt>
          <dd className="font-mono text-xs">{authContext.scope.teamId ?? "—"}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-foreground/60 text-sm font-medium">
          Effective permissions ({Object.keys(authContext.permissions).length})
        </h2>
        <ul className="mt-3 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto font-mono text-xs sm:grid-cols-2">
          {Object.entries(authContext.permissions).map(([code, scope]) => (
            <li key={code} className="text-foreground/80 flex justify-between gap-2">
              <span>{code}</span>
              <span className="text-foreground/50">{scope}</span>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/admin" className="text-sm underline underline-offset-4">
        Go to admin-only page →
      </Link>
    </div>
  );
}
