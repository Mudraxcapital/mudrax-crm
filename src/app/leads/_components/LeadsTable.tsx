"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge } from "@/shared/ui/Badge";

export interface LeadRow {
  id: string;
  fullNameSnapshot: string;
  currentStageName: string;
  leadSourceName: string;
}

const columns: DataColumn<LeadRow>[] = [
  {
    id: "fullNameSnapshot",
    header: "Name",
    accessor: (r) => r.fullNameSnapshot,
    cell: (r) => <span className="font-medium">{r.fullNameSnapshot}</span>,
    minWidth: 160,
  },
  {
    id: "currentStageName",
    header: "Stage",
    accessor: (r) => r.currentStageName,
    cell: (r) => (
      <Badge tone="info" dot>
        {r.currentStageName}
      </Badge>
    ),
    minWidth: 130,
  },
  {
    id: "leadSourceName",
    header: "Source",
    accessor: (r) => r.leadSourceName,
    minWidth: 120,
  },
];

export function LeadsTable({
  rows,
  onSelectionChange,
}: {
  rows: LeadRow[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchable
      searchPlaceholder="Filter leads…"
      emptyTitle="No leads match"
      emptyDescription="Adjust filters or create a new lead."
      onRowOpen={(row) => router.push(`/leads/${row.id}`)}
      selectable
      onSelectionChange={onSelectionChange}
    />
  );
}
