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
  canEligibility,
  canManage,
}: {
  banks: { id: string; name: string }[];
  products: { id: string; name: string; bankId: string }[];
  canEligibility: boolean;
  canManage: boolean;
}) {
  const [eligibilityId, setEligibilityId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [eligState, eligAction, eligPending] = useActionState(createEligibilityAction, {});
  const [offerState, offerAction, offerPending] = useActionState(createLoanOfferAction, {});
  const [decideState, decideAction, decidePending] = useActionState(
    async (prev: LoanApplicationsFormState | undefined, fd: FormData) => {
      if (!offerId) return { error: "Enter an offer id to accept/reject." };
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
              <input name="customerId" placeholder="Customer ID" required className={inputClass} />
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
                Snapshot created: {eligState.snapshotId}
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
              <input name="leadId" placeholder="Lead ID" required className={inputClass} />
              <input
                name="eligibilitySnapshotId"
                placeholder="Eligibility Snapshot ID"
                required
                defaultValue={eligibilityId}
                key={eligibilityId}
                className={inputClass}
              />
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
                  Offer created: {offerState.offerId}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={offerPending}
                className="bg-foreground text-background self-start rounded-lg px-4 py-2 text-sm disabled:opacity-60"
              >
                {offerPending ? "Saving…" : "Create offer"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-border p-6">
            <h2 className="text-sm font-medium">3. Accept / Reject Offer</h2>
            <form action={decideAction} className="mt-4 flex flex-col gap-4">
              <input
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
                placeholder="Offer ID"
                className={inputClass}
              />
              <select name="decision" required className={inputClass}>
                <option value="ACCEPT">Accept (creates Application)</option>
                <option value="REJECT">Reject</option>
              </select>
              {decideState.error ? (
                <p className="text-sm text-red-600">{decideState.error}</p>
              ) : null}
              <button
                type="submit"
                disabled={decidePending}
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
