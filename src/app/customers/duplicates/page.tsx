import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listDuplicateCandidates } from "@/modules/customers";
import { detectDuplicatesAction, dismissDuplicateAction } from "@/modules/customers/presentation/controllers/duplicate.actions";
import { MergeCustomersForm } from "@/modules/customers/presentation/components/MergeCustomersForm";

export default async function CustomerDuplicatesPage() {
  const { authContext } = await requirePermission("customer.merge");
  const candidates = await listDuplicateCandidates(authContext.organizationId, "DETECTED");

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/customers" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Customers
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Duplicate Detection</h1>
          <p className="text-muted mt-1 text-sm">
            Probabilistic phone/email/name matches pending human review.
          </p>
        </div>
        <form action={detectDuplicatesAction}>
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-2 text-sm "
          >
            Run detection
          </button>
        </form>
      </div>

      <section className="mx-card overflow-hidden">
        <ul className="flex flex-col">
          {candidates.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">
              No open duplicate candidates.
            </li>
          ) : (
            candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="border-b border-border px-4 py-4 text-sm last:border-0 "
              >
                <p className="font-medium">{candidate.matchType}</p>
                <p className="text-muted mt-1 font-mono text-xs">
                  {candidate.customerAId} ↔ {candidate.customerBId}
                  {candidate.matchScore !== null
                    ? ` · score ${candidate.matchScore.toFixed(2)}`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/customers/${candidate.customerAId}`}
                    className="text-accent hover:text-accent hover:underline underline-offset-4"
                  >
                    View A
                  </Link>
                  <Link
                    href={`/customers/${candidate.customerBId}`}
                    className="text-accent hover:text-accent hover:underline underline-offset-4"
                  >
                    View B
                  </Link>
                  <form action={dismissDuplicateAction.bind(null, candidate.id)}>
                    <button type="submit" className="text-accent hover:text-accent hover:underline underline-offset-4">
                      Dismiss
                    </button>
                  </form>
                </div>
                <div className="mt-4">
                  <MergeCustomersForm
                    survivingCustomerId={candidate.customerAId}
                    mergedAwayCustomerId={candidate.customerBId}
                    duplicateCandidateId={candidate.id}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
