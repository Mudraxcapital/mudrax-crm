"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge } from "@/shared/ui/Badge";

export interface LeadRow {
  id: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  currentStageName: string;
  assignedAgent: string;
  lastCallAt: string | null;
  nextActionAt: string | null;
  priority: string;
  leadSourceName: string;
}

const columns: DataColumn<LeadRow>[] = [
  {
    id: "fullNameSnapshot",
    header: "Lead Name",
    accessor: (r) => r.fullNameSnapshot,
    cell: (r) => <span className="font-medium">{r.fullNameSnapshot}</span>,
    minWidth: 160,
  },
  {
    id: "phoneSnapshot",
    header: "Phone",
    accessor: (r) => r.phoneSnapshot ?? "",
    cell: (r) => r.phoneSnapshot ?? "—",
    minWidth: 120,
  },
  {
    id: "currentStageName",
    header: "Status",
    accessor: (r) => r.currentStageName,
    cell: (r) => (
      <Badge tone="info" dot>
        {r.currentStageName}
      </Badge>
    ),
    minWidth: 130,
  },
  {
    id: "assignedAgent",
    header: "Assigned Agent",
    accessor: (r) => r.assignedAgent,
    minWidth: 140,
  },
  {
    id: "lastCallAt",
    header: "Last Call",
    accessor: (r) => r.lastCallAt ?? "",
    cell: (r) => (r.lastCallAt ? new Date(r.lastCallAt).toLocaleString() : "—"),
    minWidth: 140,
  },
  {
    id: "nextActionAt",
    header: "Next Follow-up",
    accessor: (r) => r.nextActionAt ?? "",
    cell: (r) => (r.nextActionAt ? new Date(r.nextActionAt).toLocaleString() : "—"),
    minWidth: 150,
  },
  {
    id: "priority",
    header: "Priority",
    accessor: (r) => r.priority,
    minWidth: 90,
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
      searchPlaceholder="Search leads…"
      emptyTitle="No leads match"
      emptyDescription="Adjust filters or create a new lead."
      onRowOpen={(row) => router.push(`/leads/${row.id}`)}
      selectable
      onSelectionChange={onSelectionChange}
    />
  );
}
