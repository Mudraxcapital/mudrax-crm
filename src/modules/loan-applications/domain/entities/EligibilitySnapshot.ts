export const ELIGIBILITY_METHODS = ["MANUAL", "RULE_BASED", "AUTOMATED_SCORING"] as const;
export type EligibilityMethod = (typeof ELIGIBILITY_METHODS)[number];
export const ELIGIBILITY_DECISIONS = ["ELIGIBLE", "INELIGIBLE", "CONDITIONAL"] as const;
export type EligibilityDecision = (typeof ELIGIBILITY_DECISIONS)[number];

export interface EligibilitySnapshot {
  id: string;
  loanApplicationId: string | null;
  customerId: string;
  method: EligibilityMethod;
  inputsSnapshot: Record<string, unknown>;
  decision: EligibilityDecision;
  computedCeilings: Record<string, unknown>;
  computedByUserId: string | null;
  computedAt: Date;
}
