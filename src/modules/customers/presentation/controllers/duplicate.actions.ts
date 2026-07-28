"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  CustomerMergeError,
  CustomerNotFoundError,
  detectDuplicates,
  dismissDuplicateCandidate,
  DuplicateCandidateNotFoundError,
  getCustomer,
  InvalidCustomerStateError,
  mergeCustomers,
  mergeCustomersSchema,
} from "@/modules/customers";
import { requirePermission } from "@/infra/auth/session";
import type { AuthorizationContext } from "@/modules/rbac";
import { resolveCustomerListOptions } from "@/shared/auth/applyHierarchyListFilter";
import { assertCanAccessCustomer } from "@/shared/auth/assertCanAccessCustomer";

export type DuplicateFormState = { error?: string; success?: string };

async function visibleCustomerIds(authContext: AuthorizationContext) {
  const options = await resolveCustomerListOptions(authContext);
  return options.customerIds;
}

export async function detectDuplicatesAction(
  prev: DuplicateFormState | undefined,
  formData: FormData,
): Promise<DuplicateFormState> {
  void prev;
  void formData;
  try {
    const { authContext } = await requirePermission("customer.duplicate.view");
    const customerIds = await visibleCustomerIds(authContext);
    const result = await detectDuplicates(authContext.organizationId, { customerIds });
    revalidatePath("/customers/duplicates");
    const created = result.created.length;
    const existing = result.existing.length;
    if (created === 0 && existing === 0) {
      return { success: "No phone/email duplicates found." };
    }
    return {
      success: `${created} new candidate${created === 1 ? "" : "s"} · ${existing} already listed.`,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      error: error instanceof Error ? error.message : "Detection failed. Try again.",
    };
  }
}

export async function dismissDuplicateAction(candidateId: string): Promise<void> {
  const { session, authContext } = await requirePermission("customer.duplicate.view");
  try {
    await dismissDuplicateCandidate({
      organizationId: authContext.organizationId,
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
    const [survivor, mergedAway] = await Promise.all([
      getCustomer(parsed.data.survivingCustomerId),
      getCustomer(parsed.data.mergedAwayCustomerId),
    ]);
    await assertCanAccessCustomer(authContext, survivor);
    await assertCanAccessCustomer(authContext, mergedAway);

    await mergeCustomers({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
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
  revalidatePath(`/customers/${parsed.data.mergedAwayCustomerId}`);
  revalidatePath("/leads");
  return { success: "Customers merged." };
}
