"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createEligibilitySnapshot,
  createEligibilitySchema,
  InvalidCustomerReferenceError,
} from "@/modules/loan-applications";

export interface EligibilityFormState {
  error?: string;
  snapshotId?: string;
}

export async function createEligibilityAction(
  _prev: EligibilityFormState | undefined,
  formData: FormData,
): Promise<EligibilityFormState> {
  const { session, authContext } = await requirePermission("eligibility.compute");
  const parsed = createEligibilitySchema.safeParse({
    customerId: formData.get("customerId"),
    loanApplicationId: formData.get("loanApplicationId") || null,
    method: formData.get("method") || "MANUAL",
    monthlyIncome: formData.get("monthlyIncome"),
    monthlyObligations: formData.get("monthlyObligations") || undefined,
    decision: formData.get("decision"),
    maxEligibleAmount: formData.get("maxEligibleAmount"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const snapshot = await createEligibilitySnapshot({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/loan-applications/offers");
    return { snapshotId: snapshot.id };
  } catch (error) {
    if (error instanceof InvalidCustomerReferenceError) return { error: error.message };
    throw error;
  }
}
