"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import { submitLoanApplication, InvalidApplicationTransitionError, LoanApplicationNotFoundError } from "@/modules/loan-applications";
import type { LoanApplicationsFormState } from "./loanApplicationsFormState";

export async function submitLoanApplicationAction(applicationId: string): Promise<LoanApplicationsFormState> {
  const { session, authContext } = await requirePermission("loan_application.create");
  try {
    await submitLoanApplication({
      applicationId,
      organizationId: authContext.organizationId,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath(`/loan-applications/${applicationId}`);
    revalidatePath("/loan-applications");
    return {};
  } catch (error) {
    if (error instanceof InvalidApplicationTransitionError || error instanceof LoanApplicationNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}
