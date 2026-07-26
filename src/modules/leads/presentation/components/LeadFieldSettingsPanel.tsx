"use client";

import { useMemo, useState } from "react";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import { LeadFieldForm } from "./LeadFieldForm";
import {
  createLeadFieldAction,
  hideLeadFieldAction,
  showLeadFieldAction,
  updateLeadFieldAction,
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return "—";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}M ago`;
  return `${Math.floor(months / 12)}y ago`;
}

type StatusFilter = "active" | "hidden" | "all";

export function LeadFieldSettingsPanel({ fields }: { fields: LeadFieldDefinitionDto[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [dialog, setDialog] = useState<"create" | string | null>(null);

  const primaryFields = useMemo(
    () =>
      fields
        .filter((field) => field.section === "primary")
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [fields],
  );

  const leadIdField =
    fields.find((field) => field.internalKey === "phone") ??
    primaryFields.find((field) => field.fieldType === "PHONE") ??
    null;

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

  function closeDialog() {
    setDialog(null);
  }

  return (
    <div className="flex flex-col gap-8">
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
                      <td className="text-muted px-4 py-3">{formatRelative(field.createdAt)}</td>
                      <td className="text-muted px-4 py-3">{formatRelative(field.updatedAt)}</td>
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
                            <form
                              action={hideLeadFieldAction.bind(null, field.id)}
                              onSubmit={(event) => {
                                if (
                                  !confirm(
                                    `Hide “${field.name}”? It will disappear from lead forms company-wide.`,
                                  )
                                ) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <button
                                type="submit"
                                className="text-muted hover:text-foreground text-sm"
                              >
                                Hide
                              </button>
                            </form>
                          ) : (
                            <form action={showLeadFieldAction.bind(null, field.id)}>
                              <button
                                type="submit"
                                className="text-muted hover:text-foreground text-sm"
                              >
                                Unhide
                              </button>
                            </form>
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
        onClose={closeDialog}
        title="Create Field"
        size="md"
      >
        <LeadFieldForm action={createLeadFieldAction} onSuccess={closeDialog} />
      </Dialog>

      <Dialog
        open={Boolean(editingField)}
        onClose={closeDialog}
        title="Edit Field"
        size="md"
      >
        {editingField ? (
          <LeadFieldForm
            key={editingField.id}
            action={updateLeadFieldAction.bind(null, editingField.id)}
            field={editingField}
            onSuccess={closeDialog}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
