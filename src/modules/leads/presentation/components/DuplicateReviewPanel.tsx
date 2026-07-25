"use client";

import { useMemo, useState } from "react";
import type {
  DuplicateDetectionSummary,
  DuplicateResolutionMode,
} from "../../application/use-cases/detectImportDuplicates";
import { buildDuplicateReportCsv } from "../../application/use-cases/detectImportDuplicates";

function formatRelativeUpdate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString()} ${time}`;
}

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

const STRATEGY_OPTIONS: Array<{
  value: DuplicateResolutionMode;
  title: string;
  description: string;
  recommended?: boolean;
  needsStatuses?: boolean;
}> = [
  {
    value: "skip_duplicates",
    title: "Skip all duplicates",
    description: "Import only new leads.",
    recommended: true,
  },
  {
    value: "import_all",
    title: "Import all duplicates again",
    description: "Create another lead for every duplicate match.",
  },
  {
    value: "replace_selected_statuses",
    title: "Replace selected statuses",
    description: "Close old leads in checked statuses, then import a fresh copy from Excel.",
    needsStatuses: true,
  },
  {
    value: "archive_and_reimport",
    title: "Reassign selected statuses",
    description: "Archive old leads (history kept) in checked statuses, then create new leads.",
    needsStatuses: true,
  },
];

export function DuplicateReviewPanel({
  summary,
  fileName,
  matchMode,
  onMatchModeChange,
  onRecheck,
  duplicateResolution,
  onResolutionChange,
  selectedStageIds,
  onSelectedStageIdsChange,
  pending,
  onBack,
  onContinue,
}: {
  summary: DuplicateDetectionSummary;
  fileName: string;
  matchMode: "phone" | "email" | "phone_name" | "phone_or_email";
  onMatchModeChange: (mode: "phone" | "email" | "phone_name" | "phone_or_email") => void;
  onRecheck: () => void;
  duplicateResolution: DuplicateResolutionMode;
  onResolutionChange: (mode: DuplicateResolutionMode) => void;
  selectedStageIds: string[];
  onSelectedStageIdsChange: (ids: string[]) => void;
  pending: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [statusSearch, setStatusSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const needsStatuses =
    duplicateResolution === "replace_selected_statuses" ||
    duplicateResolution === "archive_and_reimport";

  const filteredGroups = useMemo(() => {
    const q = statusSearch.trim().toLowerCase();
    if (!q) return summary.statusGroups;
    return summary.statusGroups.filter((group) => group.stageName.toLowerCase().includes(q));
  }, [statusSearch, summary.statusGroups]);

  const baseName = fileName.replace(/\.[^.]+$/, "");
  const selectedSet = new Set(selectedStageIds);
  const allStageIds = summary.statusGroups.map((group) => group.stageId);

  function toggleStage(stageId: string) {
    if (selectedSet.has(stageId)) {
      onSelectedStageIdsChange(selectedStageIds.filter((id) => id !== stageId));
    } else {
      onSelectedStageIdsChange([...selectedStageIds, stageId]);
    }
  }

  function selectAllVisible() {
    const next = new Set(selectedStageIds);
    for (const group of filteredGroups) next.add(group.stageId);
    onSelectedStageIdsChange([...next]);
  }

  function clearAll() {
    onSelectedStageIdsChange([]);
  }

  const canContinue =
    !needsStatuses || selectedStageIds.length > 0 || summary.alreadyExisting === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-sm">
          Duplicate detection based on
          <select
            value={matchMode}
            onChange={(event) =>
              onMatchModeChange(event.target.value as typeof matchMode)
            }
            className="mx-input mt-1 w-full min-w-[200px]"
          >
            <option value="phone">Phone Number</option>
            <option value="email">Email</option>
            <option value="phone_name">Phone + Name</option>
            <option value="phone_or_email">Phone or Email</option>
          </select>
        </label>
        <button
          type="button"
          className="mx-btn mx-btn-secondary"
          onClick={onRecheck}
          disabled={pending}
        >
          {pending ? "Checking…" : "Re-check duplicates"}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-border p-3">
          <dt className="text-muted">Excel Rows</dt>
          <dd className="text-lg font-semibold tabular-nums">{summary.totalRows}</dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="text-muted">Already Existing</dt>
          <dd className="text-lg font-semibold text-danger tabular-nums">
            {summary.alreadyExisting}
          </dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="text-muted">New Leads</dt>
          <dd className="text-lg font-semibold text-success tabular-nums">
            {summary.newLeadCount}
          </dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="text-muted">Based On</dt>
          <dd className="text-lg font-semibold">{summary.matchLabel}</dd>
        </div>
      </dl>

      <section className="rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium">Duplicates by Lead Status</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mx-btn mx-btn-secondary mx-btn-sm" onClick={selectAllVisible}>
              Select All
            </button>
            <button type="button" className="mx-btn mx-btn-secondary mx-btn-sm" onClick={clearAll}>
              Clear All
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-secondary mx-btn-sm"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const id of allStageIds) next[id] = true;
                setExpanded(next);
              }}
            >
              Expand
            </button>
            <button
              type="button"
              className="mx-btn mx-btn-secondary mx-btn-sm"
              onClick={() => setExpanded({})}
            >
              Collapse
            </button>
          </div>
        </div>
        <div className="border-b border-border px-4 py-3">
          <input
            value={statusSearch}
            onChange={(event) => setStatusSearch(event.target.value)}
            placeholder="Search status…"
            className="mx-input w-full"
          />
        </div>
        <ul className="divide-y divide-border">
          {filteredGroups.map((group) => {
            const isOpen = Boolean(expanded[group.stageId]);
            return (
              <li key={group.stageId} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <label className="flex min-w-0 flex-1 items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedSet.has(group.stageId)}
                      onChange={() => toggleStage(group.stageId)}
                      disabled={!needsStatuses && group.count === 0}
                    />
                    <span className="min-w-0">
                      <span className="font-medium">
                        {group.stageName}{" "}
                        <span className="text-muted font-normal">({group.count})</span>
                      </span>
                      <span className="text-muted mt-1 block text-xs">
                        {group.count} lead{group.count === 1 ? "" : "s"} · Last updated{" "}
                        {formatRelativeUpdate(group.latestUpdatedAt)}
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline underline-offset-4"
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [group.stageId]: !current[group.stageId],
                      }))
                    }
                    disabled={group.count === 0}
                  >
                    {isOpen ? "Collapse" : "Expand"}
                  </button>
                </div>
                {isOpen && group.count > 0 ? (
                  <div className="mt-3 overflow-x-auto rounded-md border border-border">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-surface-2 text-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Row</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Phone</th>
                          <th className="px-3 py-2 font-medium">Match</th>
                          <th className="px-3 py-2 font-medium">Last modified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.duplicates.slice(0, 50).map((row) => (
                          <tr key={`${group.stageId}-${row.rowNumber}`} className="border-t border-border">
                            <td className="px-3 py-2 tabular-nums">{row.rowNumber}</td>
                            <td className="px-3 py-2">{row.name || "—"}</td>
                            <td className="px-3 py-2">{row.phone || "—"}</td>
                            <td className="px-3 py-2">{row.matchReason || "—"}</td>
                            <td className="px-3 py-2">
                              {formatRelativeUpdate(row.existingUpdatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {group.duplicates.length > 50 ? (
                      <p className="text-muted px-3 py-2 text-xs">
                        Showing first 50 of {group.duplicates.length}. Download status-wise CSV for
                        the full list.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <fieldset className="flex flex-col gap-3 text-sm">
        <legend className="font-medium">Import strategy</legend>
        {STRATEGY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
              duplicateResolution === option.value
                ? "border-accent bg-accent-muted/30"
                : "border-border"
            }`}
          >
            <input
              type="radio"
              name="duplicateResolution"
              className="mt-1"
              checked={duplicateResolution === option.value}
              onChange={() => onResolutionChange(option.value)}
            />
            <span>
              <span className="font-medium">
                {option.title}
                {option.recommended ? (
                  <span className="text-muted ml-2 text-xs font-normal">(Recommended)</span>
                ) : null}
              </span>
              <span className="text-muted mt-1 block text-xs">{option.description}</span>
            </span>
          </label>
        ))}
        {needsStatuses && selectedStageIds.length === 0 ? (
          <p className="text-sm text-danger">
            Select at least one status to replace or archive before continuing.
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="mx-btn mx-btn-secondary mx-btn-sm"
          onClick={() =>
            downloadCsv(
              buildDuplicateReportCsv(summary, { category: "duplicate" }),
              `${baseName}-all-duplicates.csv`,
            )
          }
          disabled={summary.alreadyExisting === 0}
        >
          Download All Duplicates
        </button>
        <button
          type="button"
          className="mx-btn mx-btn-secondary mx-btn-sm"
          onClick={() => {
            const parts = summary.statusGroups
              .filter((group) => group.count > 0)
              .map((group) =>
                buildDuplicateReportCsv(summary, { stageId: group.stageId }),
              );
            downloadCsv(parts.join("\n\n"), `${baseName}-status-wise-duplicates.csv`);
          }}
          disabled={summary.alreadyExisting === 0}
        >
          Download Status Wise
        </button>
        <button
          type="button"
          className="mx-btn mx-btn-secondary mx-btn-sm"
          onClick={() =>
            downloadCsv(
              buildDuplicateReportCsv(summary, { category: "new" }),
              `${baseName}-fresh-only.csv`,
            )
          }
          disabled={summary.newLeadCount === 0}
        >
          Download Fresh Only
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="mx-btn mx-btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="mx-btn mx-btn-primary"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Continue to campaign
        </button>
      </div>
    </div>
  );
}
