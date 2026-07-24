import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { getDocumentsDashboard } from "@/modules/documents";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
      <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default async function DocumentsDashboardPage() {
  const { authContext } = await requirePermission("documents.dashboard.view");
  const canManageCategories = hasPermission(authContext, "document.category.manage");

  const dashboard = await getDocumentsDashboard(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Documents Dashboard</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Overview of uploaded Documents, categories, and pending verification.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Documents" value={dashboard.totalDocuments} />
        <StatCard label="Pending Verification" value={dashboard.pendingVerification} />
        <StatCard label="Categories with Docs" value={dashboard.documentsByCategory.length} />
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Documents by Category</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {dashboard.documentsByCategory.length === 0 ? (
            <li className="text-foreground/60">No Documents yet.</li>
          ) : (
            dashboard.documentsByCategory.map((entry) => (
              <li key={entry.categoryId} className="flex items-center justify-between">
                <span>{entry.categoryName}</span>
                <span className="font-medium">{entry.count}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 className="text-sm font-medium">Recently Uploaded</h2>
          <Link href="/documents/library" className="text-xs underline underline-offset-4">
            View all →
          </Link>
        </div>
        <ul className="flex flex-col">
          {dashboard.recentlyUploaded.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">
              No Documents uploaded yet.
            </li>
          ) : (
            dashboard.recentlyUploaded.map((document) => (
              <li
                key={document.id}
                className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <Link
                  href={`/documents/library/${document.id}`}
                  className="underline underline-offset-4"
                >
                  {document.documentTypeName ?? "Document"} · {document.status}
                </Link>
                <span className="text-foreground/60">
                  {new Date(document.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/documents/library" className="underline underline-offset-4">
          Document Library →
        </Link>
        {canManageCategories ? (
          <Link href="/documents/categories" className="underline underline-offset-4">
            Categories &amp; Types →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
