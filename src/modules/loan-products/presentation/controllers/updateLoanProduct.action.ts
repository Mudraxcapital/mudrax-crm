"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  updateLoanProduct,
  updateLoanProductSchema,
  LoanProductNotFoundError,
} from "@/modules/loan-products";
import type { LoanProductsFormState } from "./loanProductsFormState";

export async function updateLoanProductAction(
  loanProductId: string,
  _previousState: LoanProductsFormState | undefined,
  formData: FormData,
): Promise<LoanProductsFormState> {
  const { session, authContext } = await requirePermission("loan_product.manage");

  const parsed = updateLoanProductSchema.safeParse({
    name: formData.get("name") || undefined,
    status: formData.get("status") || undefined,
    minInterestRate: formData.get("minInterestRate") || undefined,
    maxInterestRate: formData.get("maxInterestRate") || undefined,
    minTenureMonths: formData.get("minTenureMonths") || undefined,
    maxTenureMonths: formData.get("maxTenureMonths") || undefined,
    minLoanAmount: formData.get("minLoanAmount") || undefined,
    maxLoanAmount: formData.get("maxLoanAmount") || undefined,
    eligibilityRulesJson: formData.get("eligibilityRulesJson") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateLoanProduct({
      loanProductId,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/loan-products");
    revalidatePath(`/loan-products/${loanProductId}`);
    return {};
  } catch (error) {
    if (error instanceof LoanProductNotFoundError) return { error: error.message };
    if (error instanceof Error && error.message.includes("Eligibility")) {
      return { error: error.message };
    }
    throw error;
  }
}
