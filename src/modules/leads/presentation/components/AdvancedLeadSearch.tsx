"use client";

// ============================================================================
// src/modules/leads/presentation/components/AdvancedLeadSearch.tsx
// ============================================================================

import { useActionState } from "react";
import type { LeadSource, LeadStage, SavedViewDto } from "@/modules/leads";
import {
  createSavedViewAction,
  deleteSavedViewAction,
  type ProductivityFormState,
} from "../controllers/productivity.actions";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";

const initial: ProductivityFormState = {};

export function AdvancedLeadSearch({
  stages,
  sources,
  savedViews,
  current,
}: {
  stages: LeadStage[];
  sources: LeadSource[];
  savedViews: SavedViewDto[];
  current: {
    search?: string;
    currentStageId?: string;
    leadSourceId?: string;
    assignedToUserId?: string;
  };
}) {
  const [saveState, saveAction, saving] = useActionState(createSavedViewAction, initial);

  return (
    <section className="mx-card sticky top-[calc(var(--topbar-height)+0.25rem)] z-[5] border-border/80 bg-surface/95 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        <p className="text-muted text-xs">Sticky · applies to list below</p>
      </div>
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          name="search"
          defaultValue={current.search}
          placeholder="Name, phone, or email"
          aria-label="Search leads"
        />
        <Select
          name="currentStageId"
          defaultValue={current.currentStageId ?? ""}
          aria-label="Stage"
        >
          <option value="">Any stage</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Select>
        <Select
          name="leadSourceId"
          defaultValue={current.leadSourceId ?? ""}
          aria-label="Source"
        >
          <option value="">Any source</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </Select>
        <Input
          name="assignedToUserId"
          defaultValue={current.assignedToUserId}
          placeholder="Assignee user id"
          aria-label="Assignee"
        />
        <Button type="submit" variant="secondary" className="w-full">
          Apply filters
        </Button>
      </form>

      <form action={saveAction} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="search" value={current.search ?? ""} />
        <input type="hidden" name="currentStageId" value={current.currentStageId ?? ""} />
        <input type="hidden" name="leadSourceId" value={current.leadSourceId ?? ""} />
        <input type="hidden" name="assignedToUserId" value={current.assignedToUserId ?? ""} />
        <Input
          name="name"
          required
          placeholder="Save current filters as…"
          className="min-w-[180px] flex-1"
        />
        <label className="text-muted flex items-center gap-2 text-xs">
          <input type="checkbox" name="isShared" value="true" />
          Shared
        </label>
        <Button type="submit" loading={saving} size="sm">
          Save view
        </Button>
      </form>
      {saveState.error ? (
        <p role="alert" className="mx-error mt-2">
          {saveState.error}
        </p>
      ) : null}

      {savedViews.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {savedViews.map((view) => (
            <li key={view.id} className="flex items-center gap-1">
              <a
                href={`/leads?${new URLSearchParams({
                  ...(view.filterConfig.search
                    ? { search: String(view.filterConfig.search) }
                    : {}),
                  ...(view.filterConfig.currentStageId
                    ? { currentStageId: String(view.filterConfig.currentStageId) }
                    : {}),
                  ...(view.filterConfig.leadSourceId
                    ? { leadSourceId: String(view.filterConfig.leadSourceId) }
                    : {}),
                  ...(view.filterConfig.assignedToUserId
                    ? { assignedToUserId: String(view.filterConfig.assignedToUserId) }
                    : {}),
                }).toString()}`}
                className="bg-accent-muted text-accent hover:bg-accent/15 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              >
                {view.name}
              </a>
              <form action={deleteSavedViewAction.bind(null, view.id)}>
                <button
                  type="submit"
                  className="text-muted hover:text-danger px-1 text-xs"
                  aria-label={`Delete view ${view.name}`}
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
