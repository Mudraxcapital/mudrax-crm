"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createEligibilityAction,
  type EligibilityFormState,
} from "../controllers/createEligibility.action";
import {
  createLoanOfferAction,
  type CreateOfferFormState,
} from "../controllers/createLoanOffer.action";
import { decideLoanOfferAction } from "../controllers/decideLoanOffer.action";
import type { LoanApplicationsFormState } from "../controllers/loanApplicationsFormState";

const inputClass = "mx-input";

export function OfferWorkspace({
  banks,
  products,
  customers,
  leads,
  canEligibility,
  canManage,
}: {
  banks: { id: string; name: string }[];
  products: { id: string; name: string; bankId: string }[];
  customers: { id: string; fullName: string }[];
  leads: { id: string; fullName: string }[];
  canEligibility: boolean;
  canManage: boolean;
}) {
  const [eligibilityId, setEligibilityId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [eligState, eligAction, eligPending] = useActionState(createEligibilityAction, {});
  const [offerState, offerAction, offerPending] = useActionState(createLoanOfferAction, {});
  const [decideState, decideAction, decidePending] = useActionState(
    async (prev: LoanApplicationsFormState | undefined, fd: FormData) => {
      if (!offerId) return { error: "Create or enter an offer before accepting or rejecting." };
      return decideLoanOfferAction(offerId, prev, fd);
    },
    {},
  );

  useEffect(() => {
    const state = eligState as EligibilityFormState;
    if (state.snapshotId) setEligibilityId(state.snapshotId);
  }, [eligState]);

  useEffect(() => {
    const state = offerState as CreateOfferFormState;
    if (state.offerId) setOfferId(state.offerId);
  }, [offerState]);

  return (
    <div className="flex flex-col gap-8">
      {canEligibility ? (
        <section className="rounded-xl border border-border p-6">
          <h2 className="text-sm font-medium">1. Eligibility Snapshot</h2>
          <form action={eligAction} className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <select name="customerId" required className={inputClass} defaultValue="">
                <option value="">Select customer…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
              <select name="decision" required className={inputClass}>
                <option value="ELIGIBLE">ELIGIBLE</option>
                <option value="CONDITIONAL">CONDITIONAL</option>
                <option value="INELIGIBLE">INELIGIBLE</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                name="monthlyIncome"
                placeholder="Monthly income"
                required
                className={inputClass}
              />
              <input name="monthlyObligations" placeholder="Obligations" className={inputClass} />
              <input
                name="maxEligibleAmount"
                placeholder="Max eligible amount"
                required
                className={inputClass}
              />
            </div>
            {eligState.error ? (
              <p className="text-sm text-red-600">{eligState.error}</p>
            ) : eligState.snapshotId ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                Snapshot created.{" "}
                <span className="text-muted font-mono text-xs">ID: {eligState.snapshotId}</span>
              </p>
            ) : null}
            <button
              type="submit"
              disabled={eligPending}
              className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm disabled:opacity-60"
            >
              {eligPending ? "Saving…" : "Create snapshot"}
            </button>
          </form>
        </section>
      ) : null}

      {canManage ? (
        <>
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-sm font-medium">2. Generate Offer</h2>
            <form action={offerAction} className="mt-4 flex flex-col gap-4">
              <select name="leadId" required className={inputClass} defaultValue="">
                <option value="">Select lead…</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.fullName}
                  </option>
                ))}
              </select>
              <input
                name="eligibilitySnapshotId"
                type="hidden"
                value={eligibilityId}
                key={eligibilityId}
              />
              {!eligibilityId ? (
                <p className="text-muted text-xs">
                  Create an eligibility snapshot first — it will be linked automatically.
                </p>
              ) : (
                <p className="text-muted text-xs">
                  Linked eligibility snapshot:{" "}
                  <span className="font-mono">{eligibilityId}</span>
                </p>
              )}
              <select name="bankId" required className={inputClass}>
                <option value="">Bank</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select name="loanProductId" required className={inputClass}>
                <option value="">Loan Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <input
                  name="offeredAmount"
                  placeholder="Offer amount"
                  required
                  className={inputClass}
                />
                <input
                  name="offeredInterestRate"
                  placeholder="Interest rate"
                  required
                  className={inputClass}
                />
                <input
                  name="offeredTenureMonths"
                  type="number"
                  placeholder="Tenure"
                  required
                  className={inputClass}
                />
              </div>
              {offerState.error ? (
                <p className="text-sm text-red-600">{offerState.error}</p>
              ) : offerState.offerId ? (
                <p className="text-sm text-green-700 dark:text-green-400">
                  Offer created.{" "}
                  <span className="text-muted font-mono text-xs">ID: {offerState.offerId}</span>
                </p>
              ) : null}
              <button
                type="submit"
                disabled={offerPending || !eligibilityId}
                className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm disabled:opacity-60"
              >
                {offerPending ? "Saving…" : "Create offer"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-border p-6">
            <h2 className="text-sm font-medium">3. Accept / Reject Offer</h2>
            <form action={decideAction} className="mt-4 flex flex-col gap-4">
              {offerId ? (
                <p className="text-muted text-xs">
                  Selected offer: <span className="font-mono">{offerId}</span>
                </p>
              ) : (
                <p className="text-muted text-xs">Generate an offer above to continue.</p>
              )}
              <select name="decision" required className={inputClass}>
                <option value="ACCEPT">Accept (creates Application)</option>
                <option value="REJECT">Reject</option>
              </select>
              {decideState.error ? (
                <p className="text-sm text-red-600">{decideState.error}</p>
              ) : null}
              <button
                type="submit"
                disabled={decidePending || !offerId}
                className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm disabled:opacity-60"
              >
                {decidePending ? "Saving…" : "Confirm"}
              </button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
