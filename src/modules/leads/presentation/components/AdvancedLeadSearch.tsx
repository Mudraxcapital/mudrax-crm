"use client";

// ============================================================================
// src/modules/leads/presentation/components/AdvancedLeadSearch.tsx
// ============================================================================

import { useActionState } from "react";
import type { LeadFieldDefinitionDto } from "../../application/dto/LeadFieldDefinitionDto";
import type { LeadSource, LeadStage } from "../../domain/entities/LeadCatalogs";
import type { SavedViewDto } from "../../application/dto/SavedViewDto";
import {
  createSavedViewAction,
  deleteSavedViewAction,
  type ProductivityFormState,
} from "../controllers/productivity.actions";
import { CallerNameAutocomplete } from "./CallerNameAutocomplete";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";

const initial: ProductivityFormState = {};

export function AdvancedLeadSearch({
  stages,
  sources,
  campaigns = [],
  callers = [],
  savedViews,
  filterableFields = [],
  current,
  showCallerFilter = true,
}: {
  stages: LeadStage[];
  sources: LeadSource[];
  campaigns?: { id: string; name: string }[];
  callers?: { id: string; fullName: string }[];
  savedViews: SavedViewDto[];
  filterableFields?: LeadFieldDefinitionDto[];
  showCallerFilter?: boolean;
  current: {
    search?: string;
    currentStageId?: string;
    leadSourceId?: string;
    assignedToUserId?: string;
    campaignId?: string;
    priority?: string;
    dateFrom?: string;
    dateTo?: string;
    fieldFilters?: Record<string, string>;
  };
}) {
  const [saveState, saveAction, saving] = useActionState(createSavedViewAction, initial);
  const dynamicFilters = filterableFields.filter(
    (field) =>
      !["full_name", "phone", "email", "priority"].includes(field.internalKey),
  );
  const priorityField = filterableFields.find((field) => field.internalKey === "priority");

  return (
    <section className="mx-card sticky top-[calc(var(--topbar-height)+0.25rem)] z-[5] border-border/80 bg-surface/95 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        <p className="text-muted text-xs">Sticky · applies to list below</p>
      </div>
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Input
          name="search"
          defaultValue={current.search}
          placeholder="Search searchable fields…"
          aria-label="Search leads"
        />
        {showCallerFilter ? (
          <CallerNameAutocomplete
            callers={callers}
            defaultCallerId={current.assignedToUserId}
          />
        ) : null}
        <Select name="campaignId" defaultValue={current.campaignId ?? ""} aria-label="Campaign">
          <option value="">Any campaign</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
        <Select
          name="currentStageId"
          defaultValue={current.currentStageId ?? ""}
          aria-label="Lead status"
        >
          <option value="">Any status</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Select>
        <Select
          name={priorityField ? `ff_priority` : "priority"}
          defaultValue={current.priority ?? current.fieldFilters?.priority ?? ""}
          aria-label="Priority"
        >
          <option value="">Any priority</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
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
          type="date"
          name="dateFrom"
          defaultValue={current.dateFrom}
          aria-label="Date from"
        />
        <Input type="date" name="dateTo" defaultValue={current.dateTo} aria-label="Date to" />
        {dynamicFilters.map((field) => (
          <Input
            key={field.id}
            name={`ff_${field.internalKey}`}
            defaultValue={current.fieldFilters?.[field.internalKey] ?? ""}
            placeholder={field.name}
            aria-label={field.name}
          />
        ))}
        <Button type="submit" variant="secondary" className="w-full">
          Apply filters
        </Button>
      </form>

      <form action={saveAction} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="search" value={current.search ?? ""} />
        <input type="hidden" name="currentStageId" value={current.currentStageId ?? ""} />
        <input type="hidden" name="leadSourceId" value={current.leadSourceId ?? ""} />
        <input type="hidden" name="assignedToUserId" value={current.assignedToUserId ?? ""} />
        <input type="hidden" name="campaignId" value={current.campaignId ?? ""} />
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
                  ...(view.filterConfig.campaignId
                    ? { campaignId: String(view.filterConfig.campaignId) }
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
