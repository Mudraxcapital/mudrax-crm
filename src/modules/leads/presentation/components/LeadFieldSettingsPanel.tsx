"use client";

import { useMemo, useState, useTransition } from "react";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import { LeadFieldForm } from "./LeadFieldForm";
import {
  archiveLeadFieldAction,
  createLeadFieldAction,
  hideLeadFieldAction,
  reorderLeadFieldsAction,
  restoreLeadFieldAction,
  showLeadFieldAction,
  updateLeadFieldAction,
} from "../controllers/leadField.actions";

const SECTIONS: Array<{
  id: LeadFieldDefinitionDto["section"];
  title: string;
  description: string;
}> = [
  {
    id: "primary",
    title: "Primary Fields",
    description: "Core fields shown first on lead forms and detail views.",
  },
  {
    id: "secondary",
    title: "Secondary Fields",
    description: "Additional active fields rendered after primary fields.",
  },
  {
    id: "hidden",
    title: "Hidden Fields",
    description: "Active fields that are not shown on forms (still stored).",
  },
  {
    id: "inactive",
    title: "Inactive Fields",
    description: "Archived or inactive definitions. Restore to use again.",
  },
];

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        on ? "bg-emerald-50 text-emerald-800" : "bg-surface-muted text-muted"
      }`}
    >
      {label}
    </span>
  );
}

export function LeadFieldSettingsPanel({ fields }: { fields: LeadFieldDefinitionDto[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [order, setOrder] = useState(fields.map((field) => field.id));
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: fields
      .filter((field) => field.section === section.id)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
  }));

  function move(id: string, direction: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item!);
      return copy;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          Master configuration for every lead field used across forms, import, search, filters, and
          export.
        </p>
        <button
          type="button"
          className="mx-btn mx-btn-primary"
          onClick={() => setShowCreate((value) => !value)}
        >
          {showCreate ? "Close" : "Create Field"}
        </button>
      </div>

      {showCreate ? (
        <section className="mx-card p-5">
          <h2 className="text-sm font-medium">Create Field</h2>
          <div className="mt-4">
            <LeadFieldForm action={createLeadFieldAction} />
          </div>
        </section>
      ) : null}

      <section className="mx-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Reorder</h2>
            <p className="text-muted mt-1 text-xs">
              Adjust display order, then save. Order applies across lead forms and views.
            </p>
          </div>
          <form
            action={(formData) => {
              startTransition(async () => {
                await reorderLeadFieldsAction(undefined, formData);
              });
            }}
          >
            <input type="hidden" name="orderedIds" value={order.join(",")} />
            <button type="submit" disabled={pending} className="mx-btn mx-btn-secondary">
              {pending ? "Saving…" : "Save order"}
            </button>
          </form>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {order.map((id) => {
            const field = byId.get(id);
            if (!field) return null;
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{field.name}</span>
                  <span className="text-muted ml-2 text-xs">{field.internalKey}</span>
                </span>
                <span className="flex gap-1">
                  <button type="button" className="mx-btn mx-btn-secondary px-2 py-1 text-xs" onClick={() => move(id, -1)}>
                    ↑
                  </button>
                  <button type="button" className="mx-btn mx-btn-secondary px-2 py-1 text-xs" onClick={() => move(id, 1)}>
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {sections.map((section) => (
        <section key={section.id} className="mx-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">{section.title}</h2>
            <p className="text-muted mt-1 text-xs">{section.description}</p>
          </div>
          {section.items.length === 0 ? (
            <p className="text-muted px-5 py-6 text-sm">No fields in this section.</p>
          ) : (
            <ul className="flex flex-col">
              {section.items.map((field) => {
                const boundUpdate = updateLeadFieldAction.bind(null, field.id);
                const editing = editingId === field.id;
                return (
                  <li key={field.id} className="border-b border-border px-5 py-4 last:border-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium">{field.name}</h3>
                          {field.isSystem ? (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                              System
                            </span>
                          ) : null}
                          <span className="text-muted text-xs">{field.internalKey}</span>
                        </div>
                        <p className="text-muted mt-1 text-xs">
                          {field.fieldType} · Order {field.displayOrder} ·{" "}
                          {new Date(field.updatedAt).toLocaleString()}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Flag on={field.isRequired} label="Required" />
                          <Flag on={field.isVisible} label="Visible" />
                          <Flag on={field.isSearchable} label="Searchable" />
                          <Flag on={field.isFilterable} label="Filterable" />
                          <Flag on={field.isImportable} label="Importable" />
                          <Flag on={field.isExportable} label="Exportable" />
                          <Flag on={field.status === "ACTIVE"} label={field.status} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="mx-btn mx-btn-secondary text-xs"
                          onClick={() => setEditingId(editing ? null : field.id)}
                        >
                          {editing ? "Close" : "Edit"}
                        </button>
                        {field.isVisible ? (
                          <form action={hideLeadFieldAction.bind(null, field.id)}>
                            <button type="submit" className="mx-btn mx-btn-secondary text-xs">
                              Hide
                            </button>
                          </form>
                        ) : (
                          <form action={showLeadFieldAction.bind(null, field.id)}>
                            <button type="submit" className="mx-btn mx-btn-secondary text-xs">
                              Show
                            </button>
                          </form>
                        )}
                        {field.status === "ARCHIVED" || field.status === "INACTIVE" ? (
                          <form action={restoreLeadFieldAction.bind(null, field.id)}>
                            <button type="submit" className="mx-btn mx-btn-secondary text-xs">
                              Restore
                            </button>
                          </form>
                        ) : (
                          <form action={archiveLeadFieldAction.bind(null, field.id)}>
                            <button
                              type="submit"
                              className="mx-btn mx-btn-secondary text-xs"
                              disabled={field.isSystem && (field.internalKey === "full_name" || field.internalKey === "phone")}
                              title={
                                field.isSystem &&
                                (field.internalKey === "full_name" || field.internalKey === "phone")
                                  ? "Protected system fields can only be hidden"
                                  : undefined
                              }
                            >
                              Archive
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                    {editing ? (
                      <div className="mt-4 border-t border-border pt-4">
                        <LeadFieldForm action={boundUpdate} field={field} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
