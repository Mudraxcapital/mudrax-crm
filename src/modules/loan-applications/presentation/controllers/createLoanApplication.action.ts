"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createLoanApplication, createLoanApplicationSchema,
  InvalidCustomerReferenceError, InvalidLeadReferenceError, InvalidLoanProductReferenceError,
} from "@/modules/loan-applications";
import type { LoanApplicationsFormState } from "./loanApplicationsFormState";

export async function createLoanApplicationAction(
  _prev: LoanApplicationsFormState | undefined, formData: FormData,
): Promise<LoanApplicationsFormState> {
  const { session, authContext } = await requirePermission("loan_application.create");
  const parsed = createLoanApplicationSchema.safeParse({
    customerId: formData.get("customerId"),
    leadId: formData.get("leadId"),
    loanProductId: formData.get("loanProductId"),
    bankBranchId: formData.get("bankBranchId") || null,
    requestedAmount: formData.get("requestedAmount"),
    requestedTenureMonths: formData.get("requestedTenureMonths"),
    applicationType: formData.get("applicationType") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const app = await createLoanApplication({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/loan-applications");
    redirect(`/loan-applications/${app.id}`);
  } catch (error) {
    if (error instanceof InvalidCustomerReferenceError || error instanceof InvalidLeadReferenceError || error instanceof InvalidLoanProductReferenceError) {
      return { error: error.message };
    }
    throw error;
  }
}
