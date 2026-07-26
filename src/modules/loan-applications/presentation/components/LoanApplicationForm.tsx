"use client";
import { useActionState } from "react";
import type { LoanApplicationsFormState } from "../controllers/loanApplicationsFormState";

const initialState: LoanApplicationsFormState = {};
const inputClass = "mx-input";
type FormAction = (
  s: LoanApplicationsFormState | undefined,
  fd: FormData,
) => Promise<LoanApplicationsFormState>;

export function LoanApplicationForm({
  action,
  products,
  customers,
  leads,
}: {
  action: FormAction;
  products: { id: string; name: string }[];
  customers: { id: string; fullName: string }[];
  leads: { id: string; fullName: string; customerId: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="customerId" className="text-sm font-medium">
            Customer
          </label>
          <select id="customerId" name="customerId" required className={inputClass} defaultValue="">
            <option value="">Select customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="leadId" className="text-sm font-medium">
            Lead
          </label>
          <select id="leadId" name="leadId" required className={inputClass} defaultValue="">
            <option value="">Select lead…</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="loanProductId" className="text-sm font-medium">
          Loan Product
        </label>
        <select id="loanProductId" name="loanProductId" required className={inputClass}>
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="requestedAmount" className="text-sm font-medium">
            Requested amount
          </label>
          <input id="requestedAmount" name="requestedAmount" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="requestedTenureMonths" className="text-sm font-medium">
            Tenure (months)
          </label>
          <input
            id="requestedTenureMonths"
            name="requestedTenureMonths"
            type="number"
            required
            className={inputClass}
          />
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Create Application"}
      </button>
    </form>
  );
}
