"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, statusTone } from "@/shared/ui/Badge";

export interface BranchRow {
  id: string;
  name: string;
  code: string;
  timezone: string;
  status: string;
}

const columns: DataColumn<BranchRow>[] = [
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
  { id: "timezone", header: "Timezone", accessor: (r) => r.timezone },
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
];

export function BranchesTable({
  rows,
  canManage,
}: {
  rows: BranchRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchPlaceholder="Search branches…"
      emptyTitle="No branches yet"
      onRowOpen={canManage ? (row) => router.push(`/branches/${row.id}/edit`) : undefined}
    />
  );
}
