"use client";

// ============================================================================
// src/modules/leads/presentation/components/EditLeadForm.tsx
// ============================================================================

import { useActionState } from "react";
import type { LeadDto } from "../../application/dto/LeadDto";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import type { LeadFormState } from "../controllers/createLead.action";
import { DynamicLeadFields } from "./DynamicLeadFields";

const initialState: LeadFormState = {};

type UpdateLeadFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

export function EditLeadForm({
  action,
  lead,
  fields,
}: {
  action: UpdateLeadFormAction;
  lead: LeadDto;
  fields: LeadFieldDefinitionDto[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const values: Record<string, string | undefined> = {
    full_name: lead.fullNameSnapshot,
    phone: lead.phoneSnapshot ?? undefined,
    email: lead.emailSnapshot ?? undefined,
  };
  for (const value of lead.fieldValues ?? []) {
    values[value.internalKey] = value.rawValue ?? value.displayValue;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <DynamicLeadFields fields={fields} values={values} />

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="mx-btn mx-btn-primary mt-1">
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
