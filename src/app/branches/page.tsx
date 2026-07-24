import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listBranches } from "@/modules/organization";
import { BranchForm } from "@/modules/organization/presentation/components/BranchForm";
import { createBranchAction } from "@/modules/organization/presentation/controllers/createBranch.action";

export default async function BranchesPage() {
  const { authContext } = await requirePermission("organization.view");
  const canManage = hasPermission(authContext, "branch.manage");

  const branches = await listBranches(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/organizations" className="text-sm underline underline-offset-4">
        ← Back to Organizations
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Branches</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Physical or operational offices of the Organization.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Timezone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage ? <th className="px-4 py-3 font-medium">&nbsp;</th> : null}
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="text-foreground/60 px-4 py-6 text-center"
                >
                  No Branches yet.
                </td>
              </tr>
            ) : (
              branches.map((branch) => (
                <tr
                  key={branch.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{branch.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{branch.code}</td>
                  <td className="px-4 py-3">{branch.timezone}</td>
                  <td className="px-4 py-3">{branch.isArchived ? "Archived" : "Active"}</td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/branches/${branch.id}/edit`}
                        className="text-sm underline underline-offset-4"
                      >
                        Edit
                      </Link>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {canManage ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Create Branch</h2>
          <div className="mt-4">
            <BranchForm action={createBranchAction} submitLabel="Create Branch" />
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/departments" className="underline underline-offset-4">
          Departments →
        </Link>
        <Link href="/teams" className="underline underline-offset-4">
          Teams →
        </Link>
      </nav>
    </div>
  );
}
