import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { listCallOutcomes } from "@/modules/telephony";
import { CallOutcomeForm } from "@/modules/telephony/presentation/components/CallOutcomeForm";
import { createCallOutcomeAction } from "@/modules/telephony/presentation/controllers/createCallOutcome.action";
import { updateCallOutcomeAction } from "@/modules/telephony/presentation/controllers/updateCallOutcome.action";

export default async function TelephonyOutcomesPage() {
  const { authContext } = await requirePermission("call.outcome.manage");

  const outcomes = await listCallOutcomes(authContext.organizationId);

  return (
    <div className="mx-page flex flex-col gap-6">
      <Link href="/telephony" className="text-sm text-accent hover:text-accent hover:underline underline-offset-4">
        ← Telephony Dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Call Outcomes</h1>
        <p className="text-muted mt-1 text-sm">
          The configurable business outcomes Agents record against a Call.
        </p>
      </div>

      <section className="mx-card p-5">
        <h2 className="text-sm font-medium">Add Outcome</h2>
        <div className="mt-4">
          <CallOutcomeForm action={createCallOutcomeAction} />
        </div>
      </section>

      <section className="mx-card overflow-hidden">
        <ul className="flex flex-col">
          {outcomes.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">
              No Call Outcomes configured yet.
            </li>
          ) : (
            outcomes.map((outcome) => {
              const boundUpdate = updateCallOutcomeAction.bind(null, outcome.id);
              return (
                <li
                  key={outcome.id}
                  className="border-b border-border px-4 py-4 last:border-0 "
                >
                  <CallOutcomeForm action={boundUpdate} outcome={outcome} />
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
