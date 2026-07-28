"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import {
  archiveCampaignAction,
  restartCampaignAction,
} from "@/modules/campaigns/presentation/controllers/campaignListActions.action";

export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  source: string;
  totalLeads: number;
  assignedAgents: number;
  createdBy: string;
  dates: string;
}

export function CampaignsTable({
  rows,
  canManage,
}: {
  rows: CampaignRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(id: string, action: "restart" | "archive") {
    const confirmMessage =
      action === "restart"
        ? "Restart this campaign (set status to ACTIVE)?"
        : "Archive this campaign? This is the delete action.";
    if (!window.confirm(confirmMessage)) return;

    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      const result =
        action === "restart"
          ? await restartCampaignAction(id)
          : await archiveCampaignAction(id);
      setPendingId(null);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(result.success ?? "Updated.");
      router.refresh();
    });
  }

  const columns: DataColumn<CampaignRow>[] = [
    {
      id: "name",
      header: "Campaign",
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
      minWidth: 110,
    },
    {
      id: "source",
      header: "Source",
      accessor: (r) => r.source,
      minWidth: 120,
    },
    {
      id: "totalLeads",
      header: "Total Leads",
      accessor: (r) => String(r.totalLeads),
      minWidth: 100,
    },
    {
      id: "assignedAgents",
      header: "Assigned Agents",
      accessor: (r) => String(r.assignedAgents),
      minWidth: 120,
    },
    {
      id: "createdBy",
      header: "Created By",
      accessor: (r) => r.createdBy,
      minWidth: 130,
    },
    {
      id: "dates",
      header: "Dates",
      accessor: (r) => r.dates,
      minWidth: 160,
    },
    {
      id: "actions",
      header: "Actions",
      accessor: () => "",
      filterable: false,
      sortable: false,
      minWidth: canManage ? 260 : 120,
      cell: (r) => (
        <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
          <Link href={`/campaigns/${r.id}/dashboard`}>
            <Button variant="secondary" size="sm">
              Dashboard
            </Button>
          </Link>
          {canManage ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending && pendingId === r.id}
                onClick={() => runAction(r.id, "restart")}
              >
                Restart
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isPending && pendingId === r.id}
                onClick={() => runAction(r.id, "archive")}
              >
                Delete
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {message ? (
        <p className="text-muted text-sm" role="status">
          {message}
        </p>
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        searchable
        searchPlaceholder="Search campaigns…"
        emptyTitle="No campaigns yet"
        emptyDescription="Create a campaign to start distributing leads."
        onRowOpen={(row) => router.push(`/campaigns/${row.id}`)}
        selectable
      />
    </div>
  );
}
