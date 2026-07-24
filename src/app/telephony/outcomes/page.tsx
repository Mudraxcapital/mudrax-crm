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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/telephony" className="text-sm underline underline-offset-4">
        ← Telephony Dashboard
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Call Outcomes</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          The configurable business outcomes Agents record against a Call.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-sm font-medium">Add Outcome</h2>
        <div className="mt-4">
          <CallOutcomeForm action={createCallOutcomeAction} />
        </div>
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <ul className="flex flex-col">
          {outcomes.length === 0 ? (
            <li className="text-foreground/60 px-4 py-6 text-center text-sm">
              No Call Outcomes configured yet.
            </li>
          ) : (
            outcomes.map((outcome) => {
              const boundUpdate = updateCallOutcomeAction.bind(null, outcome.id);
              return (
                <li
                  key={outcome.id}
                  className="border-b border-black/5 px-4 py-4 last:border-0 dark:border-white/10"
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
