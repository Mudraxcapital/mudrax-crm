"use server";

// ============================================================================
// src/modules/customers/presentation/controllers/createCustomer.action.ts
//
// Server Action backing the Customer creation form. Requires `customer.create`
// (rbac-catalog.ts) — mirrors createTeam.action.ts's identical shape.
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import {
  createCustomer,
  createCustomerSchema,
  DuplicateCustomerIdentifierError,
} from "@/modules/customers";

export interface CustomerFormState {
  error?: string;
}

export type CreateCustomerFormAction = (
  state: CustomerFormState | undefined,
  formData: FormData,
) => Promise<CustomerFormState>;

function collectIdentifiers(formData: FormData) {
  const identifiers: { type: "PAN" | "AADHAAR" | "PHONE" | "EMAIL"; value: string }[] = [];
  const pan = formData.get("pan");
  const aadhaar = formData.get("aadhaar");
  const phone = formData.get("phone");
  const email = formData.get("email");
  if (typeof pan === "string" && pan.trim()) identifiers.push({ type: "PAN", value: pan });
  if (typeof aadhaar === "string" && aadhaar.trim())
    identifiers.push({ type: "AADHAAR", value: aadhaar });
  if (typeof phone === "string" && phone.trim()) identifiers.push({ type: "PHONE", value: phone });
  if (typeof email === "string" && email.trim()) identifiers.push({ type: "EMAIL", value: email });
  return identifiers;
}

export async function createCustomerAction(
  _previousState: CustomerFormState | undefined,
  formData: FormData,
): Promise<CustomerFormState> {
  const { session, authContext } = await requirePermission("customer.create");

  const parsed = createCustomerSchema.safeParse({
    fullName: formData.get("fullName"),
    dob: formData.get("dob") || undefined,
    identifiers: collectIdentifiers(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let customerId: string;
  try {
    const customer = await createCustomer({
      organizationId: authContext.organizationId,
      input: parsed.data,
      actor: { actorType: "USER", actorId: session.user.id },
    });
    customerId = customer.id;
  } catch (error) {
    if (error instanceof DuplicateCustomerIdentifierError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/customers");
  redirect(`/customers/${customerId}`);
}
