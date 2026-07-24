"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  decideLoanApplication, decideLoanApplicationSchema,
  InvalidApplicationTransitionError, LoanApplicationNotFoundError,
} from "@/modules/loan-applications";
import type { LoanApplicationsFormState } from "./loanApplicationsFormState";

export async function decideLoanApplicationAction(
  applicationId: string, _prev: LoanApplicationsFormState | undefined, formData: FormData,
): Promise<LoanApplicationsFormState> {
  const { session, authContext } = await requirePermission("loan_application.decide");
  const parsed = decideLoanApplicationSchema.safeParse({
    decision: formData.get("decision"),
    rejectionReason: formData.get("rejectionReason") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await decideLoanApplication({
      applicationId,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath(`/loan-applications/${applicationId}`);
    revalidatePath("/loans");
    return {};
  } catch (error) {
    if (error instanceof InvalidApplicationTransitionError || error instanceof LoanApplicationNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}
