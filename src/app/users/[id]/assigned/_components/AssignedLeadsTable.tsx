"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge } from "@/shared/ui/Badge";

export interface AssignedLeadRow {
  id: string;
  customerName: string;
  phone: string | null;
  status: string;
  lastCall: string | null;
  nextFollowUp: string | null;
  assignedDate: string;
  campaignName: string | null;
  sourceName: string;
}

const columns: DataColumn<AssignedLeadRow>[] = [
  {
    id: "customerName",
    header: "Customer Name",
    accessor: (r) => r.customerName,
    cell: (r) => <span className="font-medium">{r.customerName}</span>,
    minWidth: 160,
  },
  {
    id: "phone",
    header: "Phone",
    accessor: (r) => r.phone ?? "",
    cell: (r) => r.phone ?? "—",
    minWidth: 120,
  },
  {
    id: "status",
    header: "Status",
    accessor: (r) => r.status,
    cell: (r) => (
      <Badge tone="info" dot>
        {r.status}
      </Badge>
    ),
    minWidth: 120,
  },
  {
    id: "lastCall",
    header: "Last Call",
    accessor: (r) => r.lastCall ?? "",
    cell: (r) => (r.lastCall ? new Date(r.lastCall).toLocaleString() : "—"),
    minWidth: 150,
  },
  {
    id: "nextFollowUp",
    header: "Next Follow Up",
    accessor: (r) => r.nextFollowUp ?? "",
    cell: (r) => (r.nextFollowUp ? new Date(r.nextFollowUp).toLocaleString() : "—"),
    minWidth: 150,
  },
  {
    id: "assignedDate",
    header: "Assigned Date",
    accessor: (r) => r.assignedDate,
    cell: (r) => new Date(r.assignedDate).toLocaleString(),
    minWidth: 150,
  },
  {
    id: "campaignName",
    header: "Campaign",
    accessor: (r) => r.campaignName ?? "",
    cell: (r) => r.campaignName ?? "—",
    minWidth: 140,
  },
  {
    id: "sourceName",
    header: "Source",
    accessor: (r) => r.sourceName,
    minWidth: 120,
  },
];

export function AssignedLeadsTable({ rows }: { rows: AssignedLeadRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchable
      searchPlaceholder="Search assigned customers…"
      emptyTitle="No assigned customers"
      emptyDescription="This employee has no leads matching the current filters."
      onRowOpen={(row) => router.push(`/leads/${row.id}`)}
    />
  );
}
