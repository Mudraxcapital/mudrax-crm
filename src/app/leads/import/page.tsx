import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { leadCatalogs, listImportBatches } from "@/modules/leads";
import { LeadImportForm } from "@/modules/leads/presentation/components/LeadImportForm";

export default async function LeadImportPage() {
  const { authContext } = await requirePermission("lead.import");
  const [sources, batches] = await Promise.all([
    leadCatalogs.listSources(authContext.organizationId),
    listImportBatches(authContext.organizationId),
  ]);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/leads" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Leads
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Bulk Import (CSV)</h1>
        <p className="text-muted mt-1 text-sm">
          Upload Lead rows. Columns: fullName, phone, email, customerId (optional).
        </p>
      </div>
      <section className="mx-card p-5">
        <LeadImportForm sources={sources} />
      </section>
      <section className="mx-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 ">
          <h2 className="text-sm font-medium">Recent import batches</h2>
        </div>
        <ul className="text-sm">
          {batches.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center">No imports yet.</li>
          ) : (
            batches.map((batch) => (
              <li
                key={batch.id}
                className="flex justify-between gap-4 border-b border-border px-4 py-3 last:border-0 "
              >
                <span>
                  {batch.sourceFileName} · {batch.status}
                </span>
                <span className="text-muted">
                  {batch.createdRowCount}/{batch.totalRowCount} created
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
