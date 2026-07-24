import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listOrganizations } from "@/modules/organization";
import { OrganizationForm } from "@/modules/organization/presentation/components/OrganizationForm";
import { createOrganizationAction } from "@/modules/organization/presentation/controllers/createOrganization.action";

export default async function OrganizationsPage() {
  const { authContext } = await requirePermission("organization.view");
  const canManage = hasPermission(authContext, "organization.manage");

  const organizations = await listOrganizations();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Back
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Organizations</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          The canonical company/company-unit scope every other record in this system belongs to.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Timezone</th>
              {canManage ? <th className="px-4 py-3 font-medium">&nbsp;</th> : null}
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="text-foreground/60 px-4 py-6 text-center"
                >
                  No Organizations yet.
                </td>
              </tr>
            ) : (
              organizations.map((organization) => (
                <tr
                  key={organization.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{organization.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{organization.code}</td>
                  <td className="px-4 py-3">{organization.status}</td>
                  <td className="px-4 py-3">{organization.timezone}</td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/organizations/${organization.id}/edit`}
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
          <h2 className="text-sm font-medium">Create Organization</h2>
          <div className="mt-4">
            <OrganizationForm action={createOrganizationAction} submitLabel="Create Organization" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
