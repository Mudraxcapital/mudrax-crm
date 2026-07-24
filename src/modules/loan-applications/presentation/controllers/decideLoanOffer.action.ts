"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  decideLoanOffer, decideLoanOfferSchema,
  InvalidOfferTransitionError, LoanOfferNotFoundError, OfferExpiredError,
} from "@/modules/loan-applications";
import type { LoanApplicationsFormState } from "./loanApplicationsFormState";

export async function decideLoanOfferAction(
  offerId: string, _prev: LoanApplicationsFormState | undefined, formData: FormData,
): Promise<LoanApplicationsFormState> {
  const { session, authContext } = await requirePermission("loan_offer.manage");
  const parsed = decideLoanOfferSchema.safeParse({ decision: formData.get("decision") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const result = await decideLoanOffer({
      offerId,
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/loan-applications");
    if (result.application) redirect(`/loan-applications/${result.application.id}`);
    return {};
  } catch (error) {
    if (error instanceof InvalidOfferTransitionError || error instanceof LoanOfferNotFoundError || error instanceof OfferExpiredError) {
      return { error: error.message };
    }
    throw error;
  }
}
