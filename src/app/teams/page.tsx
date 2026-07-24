import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listTeams, listBranches } from "@/modules/organization";
import { TeamForm } from "@/modules/organization/presentation/components/TeamForm";
import { createTeamAction } from "@/modules/organization/presentation/controllers/createTeam.action";

export default async function TeamsPage() {
  const { authContext } = await requirePermission("organization.view");
  const canManage = hasPermission(authContext, "team.manage");

  const [teams, branches] = await Promise.all([
    listTeams(authContext.organizationId),
    listBranches(authContext.organizationId),
  ]);
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/organizations" className="text-sm underline underline-offset-4">
        ← Back to Organizations
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Teams</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Operational groupings of Users for supervision, allocation, and reporting.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage ? <th className="px-4 py-3 font-medium">&nbsp;</th> : null}
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="text-foreground/60 px-4 py-6 text-center"
                >
                  No Teams yet.
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr
                  key={team.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{team.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{team.code}</td>
                  <td className="px-4 py-3">
                    {team.branchId ? (branchNameById.get(team.branchId) ?? team.branchId) : "—"}
                  </td>
                  <td className="px-4 py-3">{team.isArchived ? "Archived" : "Active"}</td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/teams/${team.id}/edit`}
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
          <h2 className="text-sm font-medium">Create Team</h2>
          <div className="mt-4">
            <TeamForm action={createTeamAction} branches={branches} submitLabel="Create Team" />
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/branches" className="underline underline-offset-4">
          Branches →
        </Link>
        <Link href="/departments" className="underline underline-offset-4">
          Departments →
        </Link>
      </nav>
    </div>
  );
}
