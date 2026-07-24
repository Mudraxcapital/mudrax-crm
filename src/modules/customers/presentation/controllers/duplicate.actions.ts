"use server";

import { revalidatePath } from "next/cache";
import {
  CustomerMergeError,
  CustomerNotFoundError,
  detectDuplicates,
  dismissDuplicateCandidate,
  DuplicateCandidateNotFoundError,
  InvalidCustomerStateError,
  mergeCustomers,
  mergeCustomersSchema,
} from "@/modules/customers";
import { repointLeadsCustomer } from "@/modules/leads";
import { requirePermission } from "@/infra/auth/session";

export type DuplicateFormState = { error?: string; success?: string };

export async function detectDuplicatesAction(): Promise<void> {
  const { authContext } = await requirePermission("customer.merge");
  await detectDuplicates(authContext.organizationId);
  revalidatePath("/customers/duplicates");
}

export async function dismissDuplicateAction(candidateId: string): Promise<void> {
  const { session } = await requirePermission("customer.merge");
  try {
    await dismissDuplicateCandidate({
      candidateId,
      reviewedByUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof DuplicateCandidateNotFoundError) {
      return;
    }
    throw error;
  }
  revalidatePath("/customers/duplicates");
}

export async function mergeCustomersAction(
  _prev: DuplicateFormState | undefined,
  formData: FormData,
): Promise<DuplicateFormState> {
  const { session, authContext } = await requirePermission("customer.merge");
  const parsed = mergeCustomersSchema.safeParse({
    survivingCustomerId: formData.get("survivingCustomerId"),
    mergedAwayCustomerId: formData.get("mergedAwayCustomerId"),
    duplicateCandidateId: formData.get("duplicateCandidateId") || undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await mergeCustomers({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    await repointLeadsCustomer(
      parsed.data.mergedAwayCustomerId,
      parsed.data.survivingCustomerId,
    );
  } catch (error) {
    if (
      error instanceof CustomerMergeError ||
      error instanceof CustomerNotFoundError ||
      error instanceof InvalidCustomerStateError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/customers");
  revalidatePath("/customers/duplicates");
  revalidatePath(`/customers/${parsed.data.survivingCustomerId}`);
  return { success: "Customers merged." };
}
