"use client";

// ============================================================================
// Renders active visible lead fields from Field Settings (create/edit/detail).
// ============================================================================

import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";

const inputClass = "mx-input";

function fieldInputName(internalKey: string): string {
  return `field_${internalKey}`;
}

export function DynamicLeadFields({
  fields,
  values,
  readOnly = false,
}: {
  fields: LeadFieldDefinitionDto[];
  values?: Record<string, string | undefined>;
  readOnly?: boolean;
}) {
  const visible = fields
    .filter((field) => field.status === "ACTIVE" && field.isVisible && field.section !== "hidden")
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  if (visible.length === 0) {
    return null;
  }

  if (readOnly) {
    return (
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((field) => (
          <div key={field.id} className="flex flex-col gap-0.5">
            <dt className="text-muted text-xs font-medium uppercase tracking-wide">{field.name}</dt>
            <dd className="text-sm">{values?.[field.internalKey]?.trim() || "—"}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {visible.map((field) => {
        const name = fieldInputName(field.internalKey);
        const defaultValue = values?.[field.internalKey] ?? field.defaultValue ?? "";
        const options = field.selectOptions ?? [];
        const label = (
          <label htmlFor={name} className="mx-label">
            {field.name}
            {field.isRequired ? " *" : ""}
          </label>
        );

        switch (field.fieldType) {
          case "TEXTAREA":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <textarea
                  id={name}
                  name={name}
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  rows={3}
                  className={inputClass}
                />
              </div>
            );
          case "NUMBER":
          case "CURRENCY":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="number"
                  step={field.fieldType === "CURRENCY" ? "0.01" : "any"}
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  className={inputClass}
                />
              </div>
            );
          case "PHONE":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="tel"
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  className={inputClass}
                />
              </div>
            );
          case "EMAIL":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="email"
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  className={inputClass}
                />
              </div>
            );
          case "URL":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="url"
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  className={inputClass}
                />
              </div>
            );
          case "DATE":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="date"
                  required={field.isRequired}
                  defaultValue={defaultValue.slice(0, 10)}
                  className={inputClass}
                />
              </div>
            );
          case "DATE_TIME":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="datetime-local"
                  required={field.isRequired}
                  defaultValue={defaultValue ? defaultValue.slice(0, 16) : ""}
                  className={inputClass}
                />
              </div>
            );
          case "BOOLEAN":
          case "CHECKBOX":
            return (
              <label key={field.id} className="flex items-center gap-2 text-sm">
                <input
                  id={name}
                  name={name}
                  type="checkbox"
                  value="true"
                  defaultChecked={defaultValue === "true" || defaultValue === "1"}
                />
                {field.name}
                {field.isRequired ? " *" : ""}
              </label>
            );
          case "DROPDOWN":
          case "RADIO":
            if (field.fieldType === "RADIO") {
              return (
                <fieldset key={field.id} className="flex flex-col gap-1.5">
                  <legend className="mx-label">
                    {field.name}
                    {field.isRequired ? " *" : ""}
                  </legend>
                  <div className="flex flex-col gap-1">
                    {options.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={name}
                          value={option}
                          required={field.isRequired}
                          defaultChecked={defaultValue === option}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            }
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <select
                  id={name}
                  name={name}
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  className={inputClass}
                >
                  <option value="">— Select —</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          case "MULTI_SELECT": {
            const selected = new Set(defaultValue.split("|").filter(Boolean));
            return (
              <fieldset key={field.id} className="flex flex-col gap-1.5">
                <legend className="mx-label">
                  {field.name}
                  {field.isRequired ? " *" : ""}
                </legend>
                <div className="flex flex-col gap-1">
                  {options.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={name}
                        value={option}
                        defaultChecked={selected.has(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }
          case "FILE":
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="text"
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  placeholder="File reference / URL"
                  className={inputClass}
                />
              </div>
            );
          default:
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {label}
                <input
                  id={name}
                  name={name}
                  type="text"
                  required={field.isRequired}
                  defaultValue={defaultValue}
                  maxLength={field.validationRules?.maxLength ?? 4000}
                  className={inputClass}
                />
              </div>
            );
        }
      })}
    </div>
  );
}

/** Re-export for client callers; Server Actions must import the lib path instead. */
export { extractFieldValuesFromFormData } from "../lib/extractFieldValuesFromFormData";
