"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, statusTone } from "@/shared/ui/Badge";

export interface CustomerRow {
  id: string;
  fullName: string;
  identityConfidence: string;
  status: string;
}

const columns: DataColumn<CustomerRow>[] = [
  {
    id: "fullName",
    header: "Name",
    accessor: (r) => r.fullName,
    cell: (r) => <span className="font-medium">{r.fullName}</span>,
    minWidth: 160,
  },
  {
    id: "identityConfidence",
    header: "Identity",
    accessor: (r) => r.identityConfidence,
    cell: (r) => <Badge tone="neutral">{r.identityConfidence}</Badge>,
    minWidth: 120,
  },
  {
    id: "status",
    header: "Status",
    accessor: (r) => r.status,
    cell: (r) => (
      <Badge tone={statusTone(r.status)} dot>
        {r.status}
      </Badge>
    ),
    minWidth: 110,
  },
];

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchable
      searchPlaceholder="Search customers…"
      emptyTitle="No customers yet"
      emptyDescription="Create a customer to start tracking identity records."
      onRowOpen={(row) => router.push(`/customers/${row.id}`)}
      selectable
    />
  );
}
