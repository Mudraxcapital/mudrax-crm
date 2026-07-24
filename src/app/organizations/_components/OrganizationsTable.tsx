"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, statusTone } from "@/shared/ui/Badge";

export interface OrganizationRow {
  id: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
}

const columns: DataColumn<OrganizationRow>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (r) => r.name,
    cell: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    id: "code",
    header: "Code",
    accessor: (r) => r.code,
    cell: (r) => <span className="font-mono text-xs">{r.code}</span>,
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
  },
  { id: "timezone", header: "Timezone", accessor: (r) => r.timezone },
];

export function OrganizationsTable({
  rows,
  canManage,
}: {
  rows: OrganizationRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchPlaceholder="Search organizations…"
      emptyTitle="No organizations yet"
      onRowOpen={
        canManage ? (row) => router.push(`/organizations/${row.id}/edit`) : undefined
      }
    />
  );
}
