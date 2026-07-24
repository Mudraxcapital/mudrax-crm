import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import {
  getLoanApplication, LoanApplicationNotFoundError,
} from "@/modules/loan-applications";
import { DecideApplicationForm } from "@/modules/loan-applications/presentation/components/DecideApplicationForm";
import { decideLoanApplicationAction } from "@/modules/loan-applications/presentation/controllers/decideLoanApplication.action";
import { SubmitApplicationButton } from "@/modules/loan-applications/presentation/components/SubmitApplicationButton";

export default async function LoanApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { authContext } = await requirePermission("loan_application.view");
  const canDecide = hasPermission(authContext, "loan_application.decide");
  const canSubmit = hasPermission(authContext, "loan_application.create");

  let app;
  try {
    app = await getLoanApplication(id, authContext.organizationId);
  } catch (error) {
    if (error instanceof LoanApplicationNotFoundError) notFound();
    throw error;
  }

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/loan-applications" className="text-sm text-accent hover:underline underline-offset-4">← Applications</Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Application</h1>
        <p className="text-muted mt-1 text-sm">
          {app.applicationStatusName} · {app.requestedAmount} · {app.requestedTenureMonths} months
        </p>
        <p className="text-muted-foreground mt-1 font-mono text-xs">Officer: {app.createdByUserId}</p>
      </div>

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Timeline</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {app.timeline.map((t) => (
            <li key={t.label} className="flex justify-between">
              <span>{t.label}</span>
              <span className="text-muted">{t.at ? new Date(t.at).toLocaleString() : "—"}</span>
            </li>
          ))}
        </ul>
      </section>

      {canSubmit && app.applicationStatusBucket === "DRAFT" ? (
        <SubmitApplicationButton applicationId={app.id} />
      ) : null}

      {canDecide && (app.applicationStatusBucket === "SUBMITTED" || app.applicationStatusBucket === "UNDER_BANK_REVIEW") ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Decision</h2>
          <div className="mt-4">
            <DecideApplicationForm action={decideLoanApplicationAction.bind(null, app.id)} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
