"use server";

// ============================================================================
// src/modules/customers/presentation/controllers/updateCustomer.action.ts
//
// Server Action backing the Customer edit form. Requires `customer.update`.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { CustomerNotFoundError, updateCustomer, updateCustomerSchema } from "@/modules/customers";
import type { CustomerFormState } from "./createCustomer.action";

export async function updateCustomerAction(
  id: string,
  _previousState: CustomerFormState | undefined,
  formData: FormData,
): Promise<CustomerFormState> {
  const { session } = await requirePermission("customer.update");

  const parsed = updateCustomerSchema.safeParse({
    fullName: formData.get("fullName") || undefined,
    dob: formData.get("dob") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCustomer({
      id,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}
