"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "./cn";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Input } from "./Input";
import { Badge } from "./Badge";

export type SortDir = "asc" | "desc";

export interface DataColumn<T> {
  id: string;
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  defaultVisible?: boolean;
  minWidth?: number;
  width?: number;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  stickyHeader?: boolean;
  onRowOpen?: (row: T) => void;
  toolbar?: ReactNode;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  initialSelected?: string[];
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  searchable = true,
  searchPlaceholder = "Filter rows…",
  emptyTitle = "No results",
  emptyDescription = "Try adjusting filters or search.",
  stickyHeader = true,
  onRowOpen,
  toolbar,
  selectable = false,
  onSelectionChange,
  initialSelected = [],
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortId, setSortId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, c.defaultVisible !== false])),
  );
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, c.width ?? Math.max(c.minWidth ?? 120, 140)])),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [focusIndex, setFocusIndex] = useState(-1);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const resizeRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  const visibleColumns = useMemo(
    () => columns.filter((c) => visible[c.id]),
    [columns, visible],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        if (col.filterable === false) return false;
        const value = col.accessor(row);
        return value != null && String(value).toLowerCase().includes(q);
      }),
    );
  }, [rows, columns, query]);

  const sorted = useMemo(() => {
    if (!sortId) return filtered;
    const col = columns.find((c) => c.id === sortId);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const result = compareValues(col.accessor(a), col.accessor(b));
      return sortDir === "asc" ? result : -result;
    });
    return copy;
  }, [filtered, columns, sortId, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [query, pageSize, sortId, sortDir]);

  useEffect(() => {
    onSelectionChange?.(Array.from(selected));
  }, [selected, onSelectionChange]);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!resizeRef.current) return;
      const { id, startX, startW } = resizeRef.current;
      const col = columns.find((c) => c.id === id);
      const min = col?.minWidth ?? 80;
      const next = Math.max(min, startW + (event.clientX - startX));
      setWidths((prev) => ({ ...prev, [id]: next }));
    }
    function onUp() {
      resizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [columns]);

  function toggleSort(id: string) {
    if (sortId === id) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortId(id);
      setSortDir("asc");
    }
  }

  function toggleAllOnPage() {
    const ids = pageRows.map(rowKey);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onKeyNav(event: KeyboardEvent<HTMLTableSectionElement>) {
    if (pageRows.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusIndex((i) => Math.min(pageRows.length - 1, i < 0 ? 0 : i + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusIndex((i) => Math.max(0, i < 0 ? 0 : i - 1));
    }
    if (event.key === "Enter" && focusIndex >= 0) {
      const row = pageRows[focusIndex];
      if (row) onRowOpen?.(row);
    }
    if (event.key === " " && focusIndex >= 0 && selectable) {
      event.preventDefault();
      const row = pageRows[focusIndex];
      if (row) toggleRow(rowKey(row));
    }
  }

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.has(rowKey(row)));

  return (
    <div className="mx-card flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-surface/95 px-3 py-2.5 backdrop-blur-sm">
        {searchable ? (
          <div className="min-w-[12rem] flex-1 sm:max-w-xs">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Filter table"
            />
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selected.size > 0 ? (
            <Badge tone="accent">{selected.size} selected</Badge>
          ) : null}
          {toolbar}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setColumnsOpen((v) => !v)}
              aria-expanded={columnsOpen}
            >
              Columns
            </Button>
            {columnsOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-border bg-surface p-2 shadow-md">
                {columns.map((col) => (
                  <label
                    key={col.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-sunken"
                  >
                    <input
                      type="checkbox"
                      checked={!!visible[col.id]}
                      onChange={() =>
                        setVisible((prev) => ({ ...prev, [col.id]: !prev[col.id] }))
                      }
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-scroll overflow-auto">
        <table
          className={cn("w-full min-w-full border-collapse text-left text-sm", stickyHeader && "mx-table-sticky")}
          style={{ tableLayout: "fixed" }}
        >
          <thead>
            <tr className="text-muted">
              {selectable ? (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allPageSelected}
                    onChange={toggleAllOnPage}
                  />
                </th>
              ) : null}
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  style={{ width: widths[col.id], minWidth: col.minWidth ?? 80 } as CSSProperties}
                  className={cn(
                    "relative px-3 py-2.5 text-xs font-medium tracking-wide uppercase select-none",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.sortable !== false ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort(col.id)}
                    >
                      {col.header}
                      {sortId === col.id ? (
                        <span aria-hidden className="text-accent">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${col.header}`}
                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-accent/40"
                    onMouseDown={(event) => {
                      resizeRef.current = {
                        id: col.id,
                        startX: event.clientX,
                        startW: widths[col.id] ?? 140,
                      };
                      document.body.style.cursor = "col-resize";
                      document.body.style.userSelect = "none";
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody tabIndex={0} onKeyDown={onKeyNav} className="outline-none">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0)}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => {
                const id = rowKey(row);
                const focused = index === focusIndex;
                return (
                  <tr
                    key={id}
                    data-focused={focused || undefined}
                    className={cn(
                      "border-t border-border transition-colors",
                      "hover:bg-accent-muted/40",
                      selected.has(id) && "bg-accent-muted/50",
                      focused && "bg-accent-muted/60 ring-1 ring-inset ring-accent/30",
                      onRowOpen && "cursor-pointer",
                    )}
                    onClick={() => onRowOpen?.(row)}
                    onMouseEnter={() => setFocusIndex(index)}
                  >
                    {selectable ? (
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${id}`}
                          checked={selected.has(id)}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "truncate px-3 py-2.5",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                        )}
                      >
                        {col.cell ? col.cell(row) : (col.accessor(row) ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-sunken/40 px-3 py-2.5 text-xs">
        <p className="text-muted">
          {sorted.length === 0
            ? "0 results"
            : `${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, sorted.length)} of ${sorted.length}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-muted flex items-center gap-1.5">
            Rows
            <select
              className="mx-select !w-auto !py-1 !text-xs"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            size="sm"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </Button>
          <span className="text-muted tabular-nums">
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
