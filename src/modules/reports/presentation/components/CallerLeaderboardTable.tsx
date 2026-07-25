"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Badge } from "@/shared/ui/Badge";
import type { CallerLeaderboardRowDto } from "../../application/dto/CallerLeaderboardDto";

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds == null) return "—";
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rem = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rem}s`;
  return `${rem}s`;
}

function rankBadge(rank: number) {
  if (rank === 1) return <Badge tone="success">🥇 {rank}</Badge>;
  if (rank === 2) return <Badge tone="info">🥈 {rank}</Badge>;
  if (rank === 3) return <Badge tone="warning">🥉 {rank}</Badge>;
  return <Badge tone="neutral">#{rank}</Badge>;
}

function outcomeValue(row: CallerLeaderboardRowDto, key: string): number {
  return row.outcomeMetrics.find((item) => item.key === key)?.value ?? 0;
}

export function CallerLeaderboardTable({
  rows,
  outcomeColumns,
}: {
  rows: CallerLeaderboardRowDto[];
  outcomeColumns: Array<{ key: string; label: string }>;
}) {
  const router = useRouter();
  const leadingOutcomes = outcomeColumns.slice(0, 6);

  const columns: DataColumn<CallerLeaderboardRowDto>[] = [
    {
      id: "rank",
      header: "Rank",
      accessor: (r) => r.rank,
      cell: (r) => rankBadge(r.rank),
      minWidth: 80,
    },
    {
      id: "profile",
      header: "Profile",
      accessor: (r) => r.employeeName,
      cell: (r) =>
        r.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.profilePhotoUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="bg-accent-muted text-accent flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
            {r.employeeName
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        ),
      minWidth: 72,
    },
    {
      id: "employeeName",
      header: "Employee",
      accessor: (r) => r.employeeName,
      cell: (r) => (
        <Link
          href={`/users/${r.userId}/assigned`}
          className="font-medium text-accent hover:underline underline-offset-4"
          onClick={(event) => event.stopPropagation()}
        >
          {r.employeeName}
        </Link>
      ),
      minWidth: 160,
    },
    {
      id: "teamLeadName",
      header: "Team Lead",
      accessor: (r) => r.teamLeadName ?? "",
      cell: (r) =>
        r.teamLeadId && r.teamLeadName ? (
          <Link
            href={`/users/${r.teamLeadId}/assigned`}
            className="text-accent hover:underline underline-offset-4"
            onClick={(event) => event.stopPropagation()}
          >
            {r.teamLeadName}
          </Link>
        ) : (
          (r.teamLeadName ?? "—")
        ),
      minWidth: 140,
    },
    {
      id: "campaign",
      header: "Campaign",
      accessor: (r) => r.primaryCampaignName ?? "",
      cell: (r) => r.primaryCampaignName ?? "—",
      minWidth: 140,
    },
    {
      id: "totalCalls",
      header: "Total Calls",
      accessor: (r) => r.totalCalls,
      cell: (r) => <span className="tabular-nums">{r.totalCalls}</span>,
      minWidth: 100,
    },
    {
      id: "connectedCalls",
      header: "Connected",
      accessor: (r) => r.connectedCalls,
      cell: (r) => <span className="tabular-nums">{r.connectedCalls}</span>,
      minWidth: 100,
    },
    {
      id: "notConnectedCalls",
      header: "Not Connected",
      accessor: (r) => r.notConnectedCalls,
      cell: (r) => <span className="tabular-nums">{r.notConnectedCalls}</span>,
      minWidth: 110,
    },
    ...leadingOutcomes.map(
      (outcome): DataColumn<CallerLeaderboardRowDto> => ({
        id: `outcome_${outcome.key}`,
        header: outcome.label,
        accessor: (r) => outcomeValue(r, outcome.key),
        cell: (r) => (
          <span className="tabular-nums">{outcomeValue(r, outcome.key)}</span>
        ),
        minWidth: 110,
      }),
    ),
    {
      id: "interestedLeads",
      header: "Interested",
      accessor: (r) => r.interestedLeads,
      cell: (r) => <span className="tabular-nums">{r.interestedLeads}</span>,
      minWidth: 100,
    },
    {
      id: "followUps",
      header: "Follow Ups",
      accessor: (r) => r.followUps,
      cell: (r) => <span className="tabular-nums">{r.followUps}</span>,
      minWidth: 100,
    },
    {
      id: "wonLeads",
      header: "Won",
      accessor: (r) => r.wonLeads,
      cell: (r) => <span className="tabular-nums">{r.wonLeads}</span>,
      minWidth: 80,
    },
    {
      id: "lostLeads",
      header: "Lost",
      accessor: (r) => r.lostLeads,
      cell: (r) => <span className="tabular-nums">{r.lostLeads}</span>,
      minWidth: 80,
    },
    {
      id: "totalTalkTimeSeconds",
      header: "Talk Time",
      accessor: (r) => r.totalTalkTimeSeconds,
      cell: (r) => formatDuration(r.totalTalkTimeSeconds),
      minWidth: 100,
    },
    {
      id: "averageTalkTimeSeconds",
      header: "Avg Talk",
      accessor: (r) => r.averageTalkTimeSeconds ?? 0,
      cell: (r) => formatDuration(r.averageTalkTimeSeconds),
      minWidth: 90,
    },
    {
      id: "callsPerHour",
      header: "Calls/Hr",
      accessor: (r) => r.callsPerHour,
      cell: (r) => <span className="tabular-nums">{r.callsPerHour.toFixed(1)}</span>,
      minWidth: 90,
    },
    {
      id: "conversionRate",
      header: "Conversion",
      accessor: (r) => r.conversionRate,
      cell: (r) => (
        <span className="tabular-nums">{(r.conversionRate * 100).toFixed(1)}%</span>
      ),
      minWidth: 100,
    },
    {
      id: "pendingLeads",
      header: "Pending",
      accessor: (r) => r.pendingLeads,
      cell: (r) => <span className="tabular-nums">{r.pendingLeads}</span>,
      minWidth: 90,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.userId}
      searchable
      searchPlaceholder="Search callers…"
      emptyTitle="No caller activity"
      emptyDescription="Adjust date range or filters to see leaderboard rankings."
      onRowOpen={(row) => router.push(`/users/${row.userId}/assigned`)}
    />
  );
}
