"use client";

// ============================================================================
// Single Lead addition form — field-first layout driven by Lead Settings.
// ============================================================================

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { LeadSource } from "../../domain/entities/LeadCatalogs";
import { pickDefaultLeadSource } from "../../domain/pickDefaultLeadSource";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import type { LeadFormState } from "../controllers/createLead.action";
import { extractFieldValuesFromFormData } from "../lib/extractFieldValuesFromFormData";

const initialState: LeadFormState = {};

type CreateLeadFormAction = (
  state: LeadFormState | undefined,
  formData: FormData,
) => Promise<LeadFormState>;

const TYPE_ICONS: Record<string, string> = {
  TEXT: "T",
  TEXTAREA: "¶",
  NUMBER: "#",
  CURRENCY: "₹",
  PHONE: "☎",
  EMAIL: "@",
  DROPDOWN: "▾",
  MULTI_SELECT: "≡",
  RADIO: "○",
  CHECKBOX: "☑",
  DATE: "D",
  DATE_TIME: "⏱",
  BOOLEAN: "Y",
  URL: "U",
  FILE: "F",
};

function fieldInputName(internalKey: string): string {
  return `field_${internalKey}`;
}

function typeIcon(type: string) {
  return TYPE_ICONS[type] ?? "T";
}

function isLeadIdField(field: LeadFieldDefinitionDto, fields: LeadFieldDefinitionDto[]) {
  if (field.internalKey === "phone") return true;
  const phone = fields.find((f) => f.internalKey === "phone");
  if (phone) return false;
  return field.fieldType === "PHONE" && field.fieldGroup === "PRIMARY";
}

export function LeadForm({
  action,
  sources,
  assignees,
  fields,
  defaultLeadSourceId,
}: {
  action: CreateLeadFormAction;
  customers?: { id: string; fullName: string }[];
  sources: LeadSource[];
  assignees: { id: string; fullName: string }[];
  fields: LeadFieldDefinitionDto[];
  defaultLeadSourceId?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [query, setQuery] = useState("");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      fields
        .filter((field) => field.status === "ACTIVE" && field.isVisible && field.section !== "hidden")
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [fields],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter(
      (field) =>
        field.name.toLowerCase().includes(q) ||
        field.internalKey.toLowerCase().includes(q) ||
        field.fieldType.toLowerCase().includes(q),
    );
  }, [visible, query]);

  const resolvedSourceId = defaultLeadSourceId ?? pickDefaultLeadSource(sources)?.id ?? "";

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <input type="hidden" name="leadSourceId" value={resolvedSourceId} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search for lead fields</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for lead fields"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
          />
        </label>
        <Link
          href="/leads"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm text-[var(--accent)] hover:underline underline-offset-4"
        >
          Previously uploaded leads
          <ExternalLinkIcon />
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No fields match your search.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((field) => {
              const name = fieldInputName(field.internalKey);
              const defaultValue = field.defaultValue ?? "";
              const options = field.selectOptions ?? [];
              const leadId = isLeadIdField(field, fields);
              const focused = focusedKey === field.internalKey;
              const isSelect =
                field.fieldType === "DROPDOWN" ||
                (field.fieldType === "RADIO" && options.length > 0);

              return (
                <div
                  key={field.id}
                  className={`px-5 py-5 transition-colors ${
                    focused && field.fieldType === "PHONE"
                      ? "bg-[color-mix(in_srgb,var(--warning)_10%,white)]"
                      : "bg-[var(--surface)]"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={name}
                      className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]"
                    >
                      {field.name}
                      {field.isRequired ? " *" : ""}
                    </label>
                    {leadId ? (
                      <span className="rounded bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        Lead ID
                      </span>
                    ) : null}
                  </div>

                  {field.fieldType === "CHECKBOX" || field.fieldType === "BOOLEAN" ? (
                    <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <input
                        id={name}
                        name={name}
                        type="checkbox"
                        value="true"
                        defaultChecked={defaultValue === "true" || defaultValue === "1"}
                        className="size-4 rounded border-[var(--border)]"
                      />
                      {field.name}
                    </label>
                  ) : field.fieldType === "TEXTAREA" ? (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-3 text-xs font-semibold text-[var(--muted-foreground)]">
                        {typeIcon(field.fieldType)}
                      </span>
                      <textarea
                        id={name}
                        name={name}
                        required={field.isRequired}
                        defaultValue={defaultValue}
                        rows={3}
                        placeholder="Text field value"
                        onFocus={() => setFocusedKey(field.internalKey)}
                        onBlur={() => setFocusedKey(null)}
                        className="w-full rounded-md border border-[var(--border)] bg-transparent py-2.5 pl-9 pr-3 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-focus)] focus:outline-none"
                      />
                    </div>
                  ) : field.fieldType === "MULTI_SELECT" ? (
                    <fieldset className="flex flex-col gap-2">
                      <legend className="sr-only">{field.name}</legend>
                      {(options.length ? options : []).map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name={name}
                            value={option}
                            defaultChecked={defaultValue.split("|").includes(option)}
                          />
                          {option}
                        </label>
                      ))}
                    </fieldset>
                  ) : field.fieldType === "RADIO" && !isSelect ? (
                    <fieldset className="flex flex-col gap-2">
                      <legend className="sr-only">{field.name}</legend>
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
                    </fieldset>
                  ) : isSelect || field.fieldType === "DROPDOWN" ? (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-foreground)]">
                        ▾
                      </span>
                      <select
                        id={name}
                        name={name}
                        required={field.isRequired}
                        defaultValue={defaultValue}
                        onFocus={() => setFocusedKey(field.internalKey)}
                        onBlur={() => setFocusedKey(null)}
                        className="w-full appearance-none rounded-md border border-[var(--border)] bg-transparent py-2.5 pl-9 pr-9 text-sm text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none"
                      >
                        <option value="">Select</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                        ▾
                      </span>
                    </div>
                  ) : field.fieldType === "PHONE" ? (
                    <div
                      className={`relative flex items-stretch overflow-hidden rounded-md border ${
                        focused
                          ? "border-[color-mix(in_srgb,var(--warning)_55%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_8%,white)]"
                          : "border-[var(--border)] bg-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 border-r border-[var(--border)] px-3 text-sm text-[var(--muted)]">
                        <span aria-hidden>🇮🇳</span>
                        <span>+91</span>
                      </span>
                      <input
                        id={name}
                        name={name}
                        type="tel"
                        required={field.isRequired || leadId}
                        defaultValue={defaultValue}
                        placeholder="Enter Phone Number"
                        onFocus={() => setFocusedKey(field.internalKey)}
                        onBlur={() => setFocusedKey(null)}
                        className="w-full bg-transparent py-2.5 pl-3 pr-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none"
                      />
                    </div>
                  ) : field.fieldType === "EMAIL" ? (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-foreground)]">
                        @
                      </span>
                      <input
                        id={name}
                        name={name}
                        type="email"
                        required={field.isRequired}
                        defaultValue={defaultValue}
                        placeholder="abc@xyz.com"
                        onFocus={() => setFocusedKey(field.internalKey)}
                        onBlur={() => setFocusedKey(null)}
                        className="w-full rounded-md border border-[var(--border)] bg-transparent py-2.5 pl-9 pr-3 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-focus)] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-foreground)]">
                        {typeIcon(field.fieldType)}
                      </span>
                      <input
                        id={name}
                        name={name}
                        type={
                          field.fieldType === "NUMBER" || field.fieldType === "CURRENCY"
                            ? "number"
                            : field.fieldType === "DATE"
                              ? "date"
                              : field.fieldType === "DATE_TIME"
                                ? "datetime-local"
                                : field.fieldType === "URL"
                                  ? "url"
                                  : "text"
                        }
                        step={field.fieldType === "CURRENCY" ? "0.01" : undefined}
                        required={field.isRequired}
                        defaultValue={
                          field.fieldType === "DATE"
                            ? defaultValue.slice(0, 10)
                            : field.fieldType === "DATE_TIME"
                              ? defaultValue
                                ? defaultValue.slice(0, 16)
                                : ""
                              : defaultValue
                        }
                        placeholder={
                          field.fieldType === "DATE" || field.fieldType === "DATE_TIME"
                            ? undefined
                            : "Text field value"
                        }
                        maxLength={field.validationRules?.maxLength ?? undefined}
                        onFocus={() => setFocusedKey(field.internalKey)}
                        onBlur={() => setFocusedKey(null)}
                        className="w-full rounded-md border border-[var(--border)] bg-transparent py-2.5 pl-9 pr-3 text-sm placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-focus)] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {assignees.length > 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-5">
          <label
            htmlFor="currentAssigneeUserId"
            className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]"
          >
            Assign to
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-foreground)]">
              ▾
            </span>
            <select
              id="currentAssigneeUserId"
              name="currentAssigneeUserId"
              className="w-full appearance-none rounded-md border border-[var(--border)] bg-transparent py-2.5 pl-9 pr-9 text-sm focus:border-[var(--border-focus)] focus:outline-none"
              defaultValue=""
            >
              <option value="">Unassigned</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {!resolvedSourceId ? (
        <p role="alert" className="mx-error text-center">
          No lead source is configured. Add one in Lead Settings / catalogs before creating leads.
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="mx-error text-center">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-center pb-4">
        <button
          type="submit"
          disabled={isPending || !resolvedSourceId}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-8 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] text-[var(--accent-foreground)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-55"
        >
          <UserPlusIcon />
          {isPending ? "Saving…" : "Add Lead"}
        </button>
      </div>
    </form>
  );
}

/** Re-export for callers that imported extract helpers via this module historically. */
export { extractFieldValuesFromFormData };

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 5h5v5M19 5l-8 8M10 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.5 18.5c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M17 8v6M14 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
