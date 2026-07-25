"use client";

import { useActionState } from "react";
import {
  LEAD_FIELD_GROUPS,
  LEAD_FIELD_TYPES,
} from "../../domain/entities/LeadFieldDefinition";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import type { LeadFieldFormState } from "../controllers/leadField.actions";

const initial: LeadFieldFormState = {};
const inputClass = "mx-input";

type FieldFormAction = (
  state: LeadFieldFormState | undefined,
  formData: FormData,
) => Promise<LeadFieldFormState>;

export function LeadFieldForm({
  action,
  field,
}: {
  action: FieldFormAction;
  field?: LeadFieldDefinitionDto;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const isEdit = Boolean(field);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="mx-label">
            Field Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={field?.name}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="internalKey" className="mx-label">
            Internal Key
          </label>
          <input
            id="internalKey"
            name="internalKey"
            defaultValue={field?.internalKey}
            disabled={isEdit}
            placeholder="auto from name"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fieldType" className="mx-label">
            Field Type
          </label>
          <select
            id="fieldType"
            name="fieldType"
            required
            defaultValue={field?.fieldType ?? "TEXT"}
            disabled={field?.isSystem}
            className={inputClass}
          >
            {LEAD_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fieldGroup" className="mx-label">
            Group
          </label>
          <select
            id="fieldGroup"
            name="fieldGroup"
            defaultValue={field?.fieldGroup ?? "SECONDARY"}
            className={inputClass}
          >
            {LEAD_FIELD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["isRequired", "Required", false],
            ["isVisible", "Visible", true],
            ["isSearchable", "Searchable", false],
            ["isFilterable", "Filterable", false],
            ["isImportable", "Add from Excel", true],
            ["isExportable", "Exportable", true],
          ] as const
        ).map(([name, label, createDefault]) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value="true"
              defaultChecked={field ? Boolean(field[name]) : createDefault}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="defaultValue" className="mx-label">
            Default Value
          </label>
          <input
            id="defaultValue"
            name="defaultValue"
            defaultValue={field?.defaultValue ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="selectOptions" className="mx-label">
            Options (dropdown / multi / radio)
          </label>
          <textarea
            id="selectOptions"
            name="selectOptions"
            rows={2}
            defaultValue={(field?.selectOptions ?? []).join("\n")}
            placeholder="One option per line"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minLength" className="mx-label">
            Min length
          </label>
          <input
            id="minLength"
            name="minLength"
            type="number"
            defaultValue={field?.validationRules?.minLength ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxLength" className="mx-label">
            Max length
          </label>
          <input
            id="maxLength"
            name="maxLength"
            type="number"
            defaultValue={field?.validationRules?.maxLength ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="min" className="mx-label">
            Min
          </label>
          <input
            id="min"
            name="min"
            type="number"
            defaultValue={field?.validationRules?.min ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="max" className="mx-label">
            Max
          </label>
          <input
            id="max"
            name="max"
            type="number"
            defaultValue={field?.validationRules?.max ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pattern" className="mx-label">
            Pattern (regex)
          </label>
          <input
            id="pattern"
            name="pattern"
            defaultValue={field?.validationRules?.pattern ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="patternMessage" className="mx-label">
            Pattern message
          </label>
          <input
            id="patternMessage"
            name="patternMessage"
            defaultValue={field?.validationRules?.patternMessage ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="mx-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <button type="submit" disabled={pending} className="mx-btn mx-btn-primary self-start">
        {pending ? "Saving…" : isEdit ? "Save field" : "Create field"}
      </button>
    </form>
  );
}
