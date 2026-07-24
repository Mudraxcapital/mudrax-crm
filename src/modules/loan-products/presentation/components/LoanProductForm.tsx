"use client";

import { useActionState } from "react";
import { LOAN_PRODUCT_STATUSES } from "../../domain/entities/LoanProduct";
import type { LoanProductsFormState } from "../controllers/loanProductsFormState";

const initialState: LoanProductsFormState = {};
const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-black/30 dark:border-white/15";

type FormAction = (s: LoanProductsFormState | undefined, fd: FormData) => Promise<LoanProductsFormState>;

export function LoanProductForm({
  action,
  banks,
  productTypes,
  defaults,
  submitLabel = "Create Loan Product",
}: {
  action: FormAction;
  banks: { id: string; name: string }[];
  productTypes: { id: string; name: string }[];
  defaults?: Record<string, string>;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bankId" className="text-sm font-medium">Bank</label>
          <select id="bankId" name="bankId" required defaultValue={defaults?.bankId} className={inputClass} disabled={Boolean(defaults?.bankId)}>
            <option value="">Select bank</option>
            {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="loanProductTypeId" className="text-sm font-medium">Product type</label>
          <select id="loanProductTypeId" name="loanProductTypeId" required defaultValue={defaults?.loanProductTypeId} className={inputClass} disabled={Boolean(defaults?.loanProductTypeId)}>
            <option value="">Select type</option>
            {productTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <input id="name" name="name" required maxLength={200} defaultValue={defaults?.name} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="variant" className="text-sm font-medium">Variant</label>
          <input id="variant" name="variant" defaultValue={defaults?.variant ?? "Standard"} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minInterestRate" className="text-sm font-medium">Min rate</label>
          <input id="minInterestRate" name="minInterestRate" required defaultValue={defaults?.minInterestRate} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxInterestRate" className="text-sm font-medium">Max rate</label>
          <input id="maxInterestRate" name="maxInterestRate" required defaultValue={defaults?.maxInterestRate} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minTenureMonths" className="text-sm font-medium">Min tenure</label>
          <input id="minTenureMonths" name="minTenureMonths" type="number" required defaultValue={defaults?.minTenureMonths} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxTenureMonths" className="text-sm font-medium">Max tenure</label>
          <input id="maxTenureMonths" name="maxTenureMonths" type="number" required defaultValue={defaults?.maxTenureMonths} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minLoanAmount" className="text-sm font-medium">Min amount</label>
          <input id="minLoanAmount" name="minLoanAmount" required defaultValue={defaults?.minLoanAmount} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxLoanAmount" className="text-sm font-medium">Max amount</label>
          <input id="maxLoanAmount" name="maxLoanAmount" required defaultValue={defaults?.maxLoanAmount} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={defaults?.status ?? "DRAFT"} className={inputClass}>
            {LOAN_PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="eligibilityRulesJson" className="text-sm font-medium">Eligibility rules (JSON, optional)</label>
        <textarea id="eligibilityRulesJson" name="eligibilityRulesJson" rows={3} defaultValue={defaults?.eligibilityRulesJson} className={inputClass} />
      </div>
      {state.error ? <p role="alert" className="text-sm text-red-600">{state.error}</p> : null}
      <button type="submit" disabled={isPending} className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
