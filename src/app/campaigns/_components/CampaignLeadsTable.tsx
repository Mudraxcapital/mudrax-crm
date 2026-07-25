"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge } from "@/shared/ui/Badge";

export interface CampaignLeadRow {
  id: string;
  fullNameSnapshot: string;
  phoneSnapshot: string | null;
  currentStageName: string;
  assignedAgent: string;
  assignedAgentUserId: string | null;
  campaignId: string;
  nextActionAt: string | null;
  priority: string;
}

export function CampaignLeadsTable({ rows }: { rows: CampaignLeadRow[] }) {
  const router = useRouter();

  const columns: DataColumn<CampaignLeadRow>[] = [
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
      minWidth: 120,
    },
    {
      id: "assignedAgent",
      header: "Assigned Agent",
      accessor: (r) => r.assignedAgent,
      cell: (r) =>
        r.assignedAgentUserId ? (
          <Link
            href={`/users/${r.assignedAgentUserId}/assigned?campaignId=${encodeURIComponent(r.campaignId)}`}
            className="text-accent hover:underline underline-offset-4"
            onClick={(event) => event.stopPropagation()}
          >
            {r.assignedAgent}
          </Link>
        ) : (
          r.assignedAgent
        ),
      minWidth: 140,
    },
    {
      id: "nextActionAt",
      header: "Next Follow-up",
      accessor: (r) => r.nextActionAt ?? "",
      cell: (r) =>
        r.nextActionAt ? new Date(r.nextActionAt).toLocaleString() : "—",
      minWidth: 150,
    },
    {
      id: "priority",
      header: "Priority",
      accessor: (r) => r.priority,
      minWidth: 90,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      searchable
      searchPlaceholder="Search leads…"
      emptyTitle="No leads in this campaign"
      emptyDescription="Add leads from Excel or assign existing ones to this campaign."
      onRowOpen={(row) => router.push(`/leads/${row.id}`)}
      selectable
    />
  );
}
