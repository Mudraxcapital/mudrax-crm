"use client";

// ============================================================================
// src/modules/documents/presentation/components/UploadDocumentForm.tsx
// ============================================================================

import { useActionState, useState } from "react";
import type { DocumentsFormState } from "../controllers/documentsFormState";

const initialState: DocumentsFormState = {};

type UploadDocumentFormAction = (
  state: DocumentsFormState | undefined,
  formData: FormData,
) => Promise<DocumentsFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function UploadDocumentForm({
  action,
  documentTypes,
  customers,
  leads,
}: {
  action: UploadDocumentFormAction;
  documentTypes: { id: string; label: string }[];
  customers: { id: string; label: string }[];
  leads: { id: string; label: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [ownerType, setOwnerType] = useState<"CUSTOMER" | "LEAD">("CUSTOMER");
  const owners = ownerType === "CUSTOMER" ? customers : leads;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground/80 text-sm font-medium">Document Type</label>
          <select name="documentTypeId" required className={inputClass}>
            <option value="">Select type…</option>
            {documentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground/80 text-sm font-medium">Owner Type</label>
          <select
            name="ownerType"
            required
            className={inputClass}
            value={ownerType}
            onChange={(event) => setOwnerType(event.target.value as "CUSTOMER" | "LEAD")}
          >
            <option value="CUSTOMER">Customer</option>
            <option value="LEAD">Lead</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-foreground/80 text-sm font-medium">
            {ownerType === "CUSTOMER" ? "Customer" : "Lead"}
          </label>
          <select name="ownerId" required className={inputClass} defaultValue="">
            <option value="">Select {ownerType === "CUSTOMER" ? "customer" : "lead"}…</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-foreground/80 text-sm font-medium">File</label>
          <input name="file" type="file" required className={inputClass} />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      >
        {isPending ? "Uploading…" : "Upload Document"}
      </button>
    </form>
  );
}
