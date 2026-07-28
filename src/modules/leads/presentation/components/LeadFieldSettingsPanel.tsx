"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import { LeadFieldForm } from "./LeadFieldForm";
import {
  createLeadFieldAction,
  hideLeadFieldAction,
  showLeadFieldAction,
  updateLeadFieldAction,
  type LeadFieldFormState,
} from "../controllers/leadField.actions";
import { Dialog } from "@/shared/ui/Dialog";
import { EmptyState } from "@/shared/ui/EmptyState";

const TYPE_LABELS: Record<string, string> = {
  TEXT: "Text",
  TEXTAREA: "Long text",
  NUMBER: "Number",
  CURRENCY: "Currency",
  PHONE: "Phone",
  EMAIL: "Email",
  DROPDOWN: "Dropdown",
  MULTI_SELECT: "Tags",
  RADIO: "Radio",
  CHECKBOX: "Checkbox",
  DATE: "Date",
  DATE_TIME: "Date & time",
  BOOLEAN: "Yes / No",
  URL: "URL",
  FILE: "File",
};

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

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type;
}

function typeIcon(type: string) {
  return TYPE_ICONS[type] ?? "T";
}

function formatFieldDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type StatusFilter = "active" | "hidden" | "all";

export function LeadFieldSettingsPanel({ fields }: { fields: LeadFieldDefinitionDto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [dialog, setDialog] = useState<"create" | string | null>(null);
  const [fieldActionMessage, setFieldActionMessage] = useState<string | null>(null);

  const leadIdField =
    fields.find((field) => field.internalKey === "phone") ??
    fields.find((field) => field.fieldType === "PHONE" && field.section === "primary") ??
    null;

  const primaryFields = useMemo(
    () =>
      fields
        .filter(
          (field) =>
            field.section === "primary" &&
            field.id !== leadIdField?.id &&
            field.internalKey !== "phone",
        )
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [fields, leadIdField?.id],
  );

  const otherFields = useMemo(() => {
    const base = fields.filter((field) => field.section !== "primary");
    const byStatus = base.filter((field) => {
      if (statusFilter === "hidden") {
        return field.section === "hidden" || field.section === "inactive";
      }
      if (statusFilter === "active") {
        return field.section === "secondary";
      }
      return true;
    });

    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(
      (field) =>
        field.name.toLowerCase().includes(q) ||
        field.fieldType.toLowerCase().includes(q) ||
        typeLabel(field.fieldType).toLowerCase().includes(q),
    );
  }, [fields, query, statusFilter]);

  const editingField =
    typeof dialog === "string" ? (fields.find((field) => field.id === dialog) ?? null) : null;

  function closeDialogAndRefresh() {
    setDialog(null);
    router.refresh();
  }

  function runFieldVisibilityAction(
    action: () => Promise<LeadFieldFormState>,
    confirmMessage?: string,
  ) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    startTransition(async () => {
      const result = await action();
      setFieldActionMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {fieldActionMessage ? (
        <p className="rounded-md border border-border bg-surface-sunken/50 px-3 py-2 text-sm">
          {fieldActionMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">Configure fields used on every lead.</p>
        <button
          type="button"
          className="mx-btn mx-btn-primary"
          onClick={() => setDialog("create")}
        >
          + Add a new Field
        </button>
      </div>

      {/* Lead ID */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-muted text-xs font-medium tracking-wide uppercase">Lead Id</p>
        </div>
        {leadIdField ? (
          <div className="mx-card flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="bg-surface-sunken text-muted flex size-8 items-center justify-center rounded-md text-sm">
                {typeIcon(leadIdField.fieldType)}
              </span>
              <span className="text-sm font-medium">{leadIdField.name}</span>
            </div>
            <button
              type="button"
              className="text-accent text-sm font-medium hover:underline"
              onClick={() => setDialog(leadIdField.id)}
            >
              Change
            </button>
          </div>
        ) : (
          <div className="mx-card px-4 py-3 text-sm text-muted">Phone is used as Lead Id.</div>
        )}
      </section>

      {/* Primary fields */}
      <section>
        <p className="text-muted mb-2 text-xs font-medium tracking-wide uppercase">
          Primary Fields
        </p>
        <div className="mx-card overflow-hidden">
          {primaryFields.length === 0 ? (
            <EmptyState
              title="No primary fields"
              description="Primary fields appear first on the lead form."
              className="py-8"
            />
          ) : (
            <ul>
              {primaryFields.map((field, index) => (
                <li
                  key={field.id}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-muted w-8 shrink-0 text-xs font-medium">
                      H{index + 1}:
                    </span>
                    <span className="bg-surface-sunken text-muted flex size-7 shrink-0 items-center justify-center rounded text-xs font-semibold">
                      {typeIcon(field.fieldType)}
                    </span>
                    <span className="truncate text-sm font-medium">{field.name}</span>
                  </div>
                  <button
                    type="button"
                    className="text-muted hover:text-foreground text-sm"
                    onClick={() => setDialog(field.id)}
                    aria-label={`Edit ${field.name}`}
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Other fields table */}
      <section>
        <p className="text-muted mb-2 text-xs font-medium tracking-wide uppercase">Other Fields</p>
        <div className="mx-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="mx-input max-w-xs flex-1"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="mx-input w-auto"
            >
              <option value="active">Active Fields</option>
              <option value="hidden">Hidden Fields</option>
              <option value="all">All Fields</option>
            </select>
          </div>

          <p className="text-muted border-b border-border px-4 py-2 text-xs">
            {otherFields.length} result{otherFields.length === 1 ? "" : "s"} found.
          </p>

          {otherFields.length === 0 ? (
            <EmptyState
              title="No fields found"
              description="Try a different search or add a new field."
              action={
                <button
                  type="button"
                  className="mx-btn mx-btn-primary text-xs"
                  onClick={() => setDialog("create")}
                >
                  + Add a new Field
                </button>
              }
              className="py-10"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-surface-sunken/50 text-muted text-xs">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Field Name</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Created On</th>
                    <th className="px-4 py-2.5 font-medium">Last Modified</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {otherFields.map((field) => (
                    <tr key={field.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <span className="bg-surface-sunken text-muted flex size-7 items-center justify-center rounded text-xs font-semibold">
                            {typeIcon(field.fieldType)}
                          </span>
                          <span className="font-medium">{field.name}</span>
                        </span>
                      </td>
                      <td className="text-muted px-4 py-3">{typeLabel(field.fieldType)}</td>
                      <td className="text-muted px-4 py-3">{formatFieldDate(field.createdAt)}</td>
                      <td className="text-muted px-4 py-3">{formatFieldDate(field.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            className="text-accent text-sm font-medium hover:underline"
                            onClick={() => setDialog(field.id)}
                          >
                            Edit
                          </button>
                          {field.isSystem &&
                          (field.internalKey === "full_name" || field.internalKey === "phone") ? (
                            <span className="text-muted text-xs">Protected</span>
                          ) : field.isVisible && field.section !== "inactive" ? (
                            <button
                              type="button"
                              disabled={pending}
                              className="text-muted hover:text-foreground text-sm"
                              onClick={() =>
                                runFieldVisibilityAction(
                                  () => hideLeadFieldAction(field.id),
                                  `Hide “${field.name}”? It will disappear from lead forms company-wide.`,
                                )
                              }
                            >
                              Hide
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={pending}
                              className="text-muted hover:text-foreground text-sm"
                              onClick={() =>
                                runFieldVisibilityAction(() => showLeadFieldAction(field.id))
                              }
                            >
                              Unhide
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Dialog
        open={dialog === "create"}
        onClose={() => setDialog(null)}
        title="Create Field"
        size="md"
      >
        <LeadFieldForm action={createLeadFieldAction} onSuccess={closeDialogAndRefresh} />
      </Dialog>

      <Dialog
        open={Boolean(editingField)}
        onClose={() => setDialog(null)}
        title="Edit Field"
        size="md"
      >
        {editingField ? (
          <LeadFieldForm
            key={editingField.id}
            action={updateLeadFieldAction.bind(null, editingField.id)}
            field={editingField}
            onSuccess={closeDialogAndRefresh}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
