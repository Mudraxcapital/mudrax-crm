"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/infra/auth/session";
import {
  createLoanOffer,
  createLoanOfferSchema,
  EligibilitySnapshotNotFoundError,
  InvalidLoanProductReferenceError,
} from "@/modules/loan-applications";

export interface CreateOfferFormState {
  error?: string;
  offerId?: string;
}

export async function createLoanOfferAction(
  _prev: CreateOfferFormState | undefined,
  formData: FormData,
): Promise<CreateOfferFormState> {
  const { session, authContext } = await requirePermission("loan_offer.manage");
  const parsed = createLoanOfferSchema.safeParse({
    leadId: formData.get("leadId"),
    eligibilitySnapshotId: formData.get("eligibilitySnapshotId"),
    bankId: formData.get("bankId"),
    loanProductId: formData.get("loanProductId"),
    offeredAmount: formData.get("offeredAmount"),
    offeredInterestRate: formData.get("offeredInterestRate"),
    offeredTenureMonths: formData.get("offeredTenureMonths"),
    expiresAt: formData.get("expiresAt") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const offer = await createLoanOffer({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    revalidatePath("/loan-applications/offers");
    return { offerId: offer.id };
  } catch (error) {
    if (
      error instanceof EligibilitySnapshotNotFoundError ||
      error instanceof InvalidLoanProductReferenceError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}
