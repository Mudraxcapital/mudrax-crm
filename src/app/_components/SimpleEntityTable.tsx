"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, statusTone } from "@/shared/ui/Badge";

export interface SimpleEntityRow {
  id: string;
  name: string;
  code?: string;
  status?: string;
  meta?: string;
}

const baseColumns: DataColumn<SimpleEntityRow>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (r) => r.name,
    cell: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    id: "code",
    header: "Code",
    accessor: (r) => r.code ?? "",
    cell: (r) =>
      r.code ? <span className="font-mono text-xs">{r.code}</span> : "—",
  },
  {
    id: "meta",
    header: "Details",
    accessor: (r) => r.meta ?? "",
    cell: (r) => r.meta ?? "—",
  },
  {
    id: "status",
    header: "Status",
    accessor: (r) => r.status ?? "",
    cell: (r) =>
      r.status ? (
        <Badge tone={statusTone(r.status)} dot>
          {r.status}
        </Badge>
      ) : (
        "—"
      ),
  },
];

export function SimpleEntityTable({
  rows,
  editHrefPrefix,
  searchPlaceholder,
  emptyTitle,
}: {
  rows: SimpleEntityRow[];
  /** Serializable path prefix for row open, e.g. `/departments` → `/departments/{id}/edit`. */
  editHrefPrefix?: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
}) {
  const router = useRouter();
  const hasCode = rows.some((r) => r.code);
  const hasMeta = rows.some((r) => r.meta);
  const hasStatus = rows.some((r) => r.status);
  const columns = baseColumns.filter((col) => {
    if (col.id === "code") return hasCode;
    if (col.id === "meta") return hasMeta;
    if (col.id === "status") return hasStatus;
    return true;
  });

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchPlaceholder={searchPlaceholder}
      emptyTitle={emptyTitle}
      emptyDescription={
        rows.length === 0 ? "Create the first record to get started." : "Try adjusting search."
      }
      onRowOpen={
        editHrefPrefix
          ? (row) => router.push(`${editHrefPrefix}/${row.id}/edit`)
          : undefined
      }
    />
  );
}
