"use client";

import { useActionState, useEffect, useState } from "react";
import {
  LEAD_FIELD_TYPES,
  type LeadFieldType,
} from "../../domain/entities/LeadFieldDefinition";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import type { LeadFieldFormState } from "../controllers/leadField.actions";

const initial: LeadFieldFormState = {};

const TYPE_META: Record<
  LeadFieldType,
  { label: string; description: string; icon: string }
> = {
  TEXT: {
    label: "Text",
    description: "Customer Name, Company Name, City, Address, etc.",
    icon: "T",
  },
  TEXTAREA: {
    label: "Long text",
    description: "Notes, comments, or longer descriptions.",
    icon: "¶",
  },
  NUMBER: {
    label: "Number",
    description: "Age, tenure, count, or other numeric values.",
    icon: "#",
  },
  CURRENCY: {
    label: "Currency",
    description: "Loan Amount, Income, EMI, and other money values.",
    icon: "₹",
  },
  PHONE: {
    label: "Phone",
    description: "Mobile or alternate phone numbers.",
    icon: "☎",
  },
  EMAIL: {
    label: "Email",
    description: "Work or personal email addresses.",
    icon: "@",
  },
  DROPDOWN: {
    label: "Dropdown",
    description: "Pick one option — State, Occupation, Source, etc.",
    icon: "▾",
  },
  MULTI_SELECT: {
    label: "Tags",
    description: "Pick multiple options — Interests, Categories, etc.",
    icon: "≡",
  },
  RADIO: {
    label: "Radio",
    description: "Pick one option from a short list.",
    icon: "○",
  },
  CHECKBOX: {
    label: "Checkbox",
    description: "Yes/no style choices.",
    icon: "☑",
  },
  DATE: {
    label: "Date",
    description: "Birth date, follow-up date, etc.",
    icon: "D",
  },
  DATE_TIME: {
    label: "Date & time",
    description: "Exact date and time values.",
    icon: "⏱",
  },
  BOOLEAN: {
    label: "Yes / No",
    description: "Simple true or false values.",
    icon: "Y",
  },
  URL: {
    label: "URL",
    description: "Website or profile links.",
    icon: "U",
  },
  FILE: {
    label: "File",
    description: "Upload a document or attachment.",
    icon: "F",
  },
};

type FieldFormAction = (
  state: LeadFieldFormState | undefined,
  formData: FormData,
) => Promise<LeadFieldFormState>;

function ToggleRow({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
      <span className="text-sm">{label}</span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input type="hidden" name={name} value={checked ? "true" : "false"} />
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30" />
        <span className="absolute left-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function LeadFieldForm({
  action,
  field,
  onSuccess,
}: {
  action: FieldFormAction;
  field?: LeadFieldDefinitionDto;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const isEdit = Boolean(field);
  const [fieldType, setFieldType] = useState<LeadFieldType>(field?.fieldType ?? "TEXT");
  const [showTypes, setShowTypes] = useState(false);
  const [props, setProps] = useState({
    isVisible: field?.isVisible ?? true,
    isRequired: field?.isRequired ?? false,
    isImportable: field?.isImportable ?? true,
    isExportable: field?.isExportable ?? true,
    isSearchable: field?.isSearchable ?? false,
    isFilterable: field?.isFilterable ?? false,
  });

  const needsOptions =
    fieldType === "DROPDOWN" || fieldType === "MULTI_SELECT" || fieldType === "RADIO";
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const isProtectedCore =
    Boolean(field?.isSystem) &&
    (field?.internalKey === "full_name" || field?.internalKey === "phone");

  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

  const selected = TYPE_META[fieldType];

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        const form = event.currentTarget;
        if (needsOptions) {
          const optionsInput = form.elements.namedItem("selectOptions");
          const raw =
            optionsInput instanceof HTMLTextAreaElement ? optionsInput.value.trim() : "";
          const options = raw
            .split(/\r?\n|,/)
            .map((part) => part.trim())
            .filter(Boolean);
          if (options.length === 0) {
            event.preventDefault();
            setOptionsError("Add at least one option (one per line).");
            return;
          }
          setOptionsError(null);
        }
        if (!isEdit || isProtectedCore) return;
        const nameInput = event.currentTarget.elements.namedItem("name");
        const nextName =
          nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
        const renamed = Boolean(field?.name && nextName && nextName !== field.name);
        const visibilityChanged = props.isVisible !== (field?.isVisible ?? true);
        const requiredChanged = props.isRequired !== (field?.isRequired ?? false);
        if (renamed || visibilityChanged || requiredChanged) {
          if (
            !confirm(
              "This change applies to every lead form company-wide. Continue?",
            )
          ) {
            event.preventDefault();
          }
        }
      }}
    >
      <input type="hidden" name="fieldType" value={fieldType} />
      <input type="hidden" name="fieldGroup" value={field?.fieldGroup ?? "SECONDARY"} />
      {isEdit && field ? (
        <input type="hidden" name="expectedUpdatedAt" value={field.updatedAt} />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="mx-label">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={100}
          defaultValue={field?.name}
          placeholder="e.g. Loan Amount"
          className="mx-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="mx-label">Type</span>
        <button
          type="button"
          disabled={field?.isSystem}
          onClick={() => setShowTypes((v) => !v)}
          className="mx-input flex items-center justify-between gap-2 text-left disabled:opacity-60"
        >
          <span className="flex items-center gap-2.5">
            <span className="bg-surface-sunken text-muted flex size-7 items-center justify-center rounded text-xs font-semibold">
              {selected.icon}
            </span>
            <span>
              <span className="block text-sm font-medium">{selected.label}</span>
              <span className="text-muted block text-xs">{selected.description}</span>
            </span>
          </span>
          <span className="text-muted text-xs">{showTypes ? "▲" : "▼"}</span>
        </button>

        {showTypes && !field?.isSystem ? (
          <ul className="max-h-56 overflow-y-auto rounded-lg border border-border bg-surface">
            {LEAD_FIELD_TYPES.map((type) => {
              const meta = TYPE_META[type];
              const active = type === fieldType;
              return (
                <li key={type}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-surface-sunken ${
                      active ? "bg-accent-muted" : ""
                    }`}
                    onClick={() => {
                      setFieldType(type);
                      setShowTypes(false);
                    }}
                  >
                    <span className="bg-surface-sunken text-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded text-xs font-semibold">
                      {meta.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{meta.label}</span>
                      <span className="text-muted block text-xs leading-snug">
                        {meta.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {needsOptions ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="selectOptions" className="mx-label">
            Options *
          </label>
          <textarea
            id="selectOptions"
            name="selectOptions"
            rows={3}
            defaultValue={(field?.selectOptions ?? []).join("\n")}
            placeholder={"One option per line"}
            className="mx-input"
            onChange={() => setOptionsError(null)}
          />
          {optionsError ? <p className="text-danger text-xs">{optionsError}</p> : null}
        </div>
      ) : (
        <input type="hidden" name="selectOptions" value={(field?.selectOptions ?? []).join("\n")} />
      )}

      <details className="rounded-lg border border-border" open={!isEdit}>
        <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">Properties</summary>
        <div className="divide-y divide-border border-t border-border px-3">
          {isProtectedCore ? (
            <>
              <p className="text-muted py-2.5 text-xs">
                Core system fields cannot be hidden or have their required flag reduced.
              </p>
              <input type="hidden" name="isVisible" value="true" />
              <input
                type="hidden"
                name="isRequired"
                value={field?.isRequired ? "true" : "false"}
              />
            </>
          ) : (
            <>
              <ToggleRow
                name="isVisible"
                label="Show on lead form"
                checked={props.isVisible}
                onChange={(next) => setProps((p) => ({ ...p, isVisible: next }))}
              />
              <ToggleRow
                name="isRequired"
                label="Required"
                checked={props.isRequired}
                onChange={(next) => setProps((p) => ({ ...p, isRequired: next }))}
              />
            </>
          )}
          <ToggleRow
            name="isImportable"
            label="Show in Excel import"
            checked={props.isImportable}
            onChange={(next) => setProps((p) => ({ ...p, isImportable: next }))}
          />
          <ToggleRow
            name="isExportable"
            label="Include in export"
            checked={props.isExportable}
            onChange={(next) => setProps((p) => ({ ...p, isExportable: next }))}
          />
          <ToggleRow
            name="isSearchable"
            label="Searchable"
            checked={props.isSearchable}
            onChange={(next) => setProps((p) => ({ ...p, isSearchable: next }))}
          />
          <ToggleRow
            name="isFilterable"
            label="Filterable"
            checked={props.isFilterable}
            onChange={(next) => setProps((p) => ({ ...p, isFilterable: next }))}
          />
          <div className="py-2.5">
            <label htmlFor="defaultValue" className="mx-label">
              Default value
            </label>
            <input
              id="defaultValue"
              name="defaultValue"
              defaultValue={field?.defaultValue ?? ""}
              className="mx-input mt-1.5"
            />
          </div>
        </div>
      </details>

      <input type="hidden" name="minLength" value={field?.validationRules?.minLength ?? ""} />
      <input type="hidden" name="maxLength" value={field?.validationRules?.maxLength ?? ""} />
      <input type="hidden" name="min" value={field?.validationRules?.min ?? ""} />
      <input type="hidden" name="max" value={field?.validationRules?.max ?? ""} />
      <input type="hidden" name="pattern" value={field?.validationRules?.pattern ?? ""} />
      <input
        type="hidden"
        name="patternMessage"
        value={field?.validationRules?.patternMessage ?? ""}
      />
      {!isEdit ? <input type="hidden" name="internalKey" value="" /> : null}

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="mx-btn mx-btn-primary self-start">
        {pending ? "Saving…" : isEdit ? "Save" : "Create Field"}
      </button>
    </form>
  );
}
