"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createLoanProduct,
  createLoanProductSchema,
  DuplicateLoanProductError,
  InvalidBankReferenceError,
  LoanProductTypeNotFoundError,
} from "@/modules/loan-products";
import type { LoanProductsFormState } from "./loanProductsFormState";

export async function createLoanProductAction(
  _previousState: LoanProductsFormState | undefined,
  formData: FormData,
): Promise<LoanProductsFormState> {
  const { session, authContext } = await requirePermission("loan_product.manage");

  const parsed = createLoanProductSchema.safeParse({
    bankId: formData.get("bankId"),
    loanProductTypeId: formData.get("loanProductTypeId"),
    variant: formData.get("variant") || "Standard",
    name: formData.get("name"),
    status: formData.get("status") || undefined,
    minInterestRate: formData.get("minInterestRate"),
    maxInterestRate: formData.get("maxInterestRate"),
    minTenureMonths: formData.get("minTenureMonths"),
    maxTenureMonths: formData.get("maxTenureMonths"),
    minLoanAmount: formData.get("minLoanAmount"),
    maxLoanAmount: formData.get("maxLoanAmount"),
    eligibilityRulesJson: formData.get("eligibilityRulesJson") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const product = await createLoanProduct({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/loan-products");
    redirect(`/loan-products/${product.id}`);
  } catch (error) {
    if (
      error instanceof DuplicateLoanProductError ||
      error instanceof InvalidBankReferenceError ||
      error instanceof LoanProductTypeNotFoundError
    ) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message.includes("Eligibility")) {
      return { error: error.message };
    }
    throw error;
  }
}
