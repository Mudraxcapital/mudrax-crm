"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, statusTone } from "@/shared/ui/Badge";

export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  dates: string;
}

const columns: DataColumn<CampaignRow>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (r) => r.name,
    cell: (r) => <span className="font-medium">{r.name}</span>,
    minWidth: 180,
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
    minWidth: 120,
  },
  {
    id: "dates",
    header: "Dates",
    accessor: (r) => r.dates,
    minWidth: 180,
  },
];

export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchPlaceholder="Search campaigns…"
      emptyTitle="No campaigns yet"
      emptyDescription="Create a campaign to start distributing leads."
      onRowOpen={(row) => router.push(`/campaigns/${row.id}`)}
      selectable
    />
  );
}
