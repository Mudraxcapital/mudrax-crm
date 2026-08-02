"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  DonutChart,
  HorizontalBarChart,
  TrendLineChart,
} from "@/app/reports/_components/AnalyticsCharts";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody, CardHeader, StatCard } from "@/shared/ui/Card";
import { renderCsv } from "@/shared/csv/csv";
import type { LeadStage, LostReason } from "@/modules/leads";
import type { CampaignDashboardData } from "../_lib/loadCampaignDashboard";
import {
  CAMPAIGN_DASHBOARD_RANGES,
  type CampaignDashboardRange,
  type CampaignProgressGranularity,
} from "../_lib/campaignDashboardRange";
import { CampaignLeadActionsPanel } from "./CampaignLeadActionsPanel";

function downloadBlob(filename: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function ReportAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="text-muted text-xs" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? <div className="border-t border-border px-3 py-3">{children}</div> : null}
    </div>
  );
}

function RangeFilters({
  selected,
  granularity,
}: {
  selected: CampaignDashboardRange;
  granularity: CampaignProgressGranularity;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-[140px] flex-col gap-1.5 text-sm">
        <span className="mx-label">Quick filter</span>
        <select
          className="mx-input"
          value={selected}
          aria-label="Dashboard date range"
          onChange={(event) =>
            pushParams((params) => {
              const value = event.target.value;
              if (value === "month") params.delete("range");
              else params.set("range", value);
            })
          }
        >
          {CAMPAIGN_DASHBOARD_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </label>

      {selected === "custom" ? (
        <>
          <label className="flex min-w-[140px] flex-col gap-1.5 text-sm">
            <span className="mx-label">From</span>
            <input
              type="date"
              className="mx-input"
              defaultValue={searchParams.get("from") ?? ""}
              onChange={(event) =>
                pushParams((params) => {
                  if (event.target.value) params.set("from", event.target.value);
                  else params.delete("from");
                })
              }
            />
          </label>
          <label className="flex min-w-[140px] flex-col gap-1.5 text-sm">
            <span className="mx-label">To</span>
            <input
              type="date"
              className="mx-input"
              defaultValue={searchParams.get("to") ?? ""}
              onChange={(event) =>
                pushParams((params) => {
                  if (event.target.value) params.set("to", event.target.value);
                  else params.delete("to");
                })
              }
            />
          </label>
        </>
      ) : null}

      <label className="flex min-w-[120px] flex-col gap-1.5 text-sm">
        <span className="mx-label">Progress</span>
        <select
          className="mx-input"
          value={granularity}
          aria-label="Progress granularity"
          onChange={(event) =>
            pushParams((params) => {
              if (event.target.value === "daily") params.delete("granularity");
              else params.set("granularity", event.target.value);
            })
          }
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </label>
    </div>
  );
}

export function CampaignDashboardClient({
  data,
  range,
  granularity,
  agentUserId,
  stages,
  lostReasons,
  callOutcomes,
  canCall,
  canUpdate,
  canUpdateCall,
  canCreateFollowUp,
  callerOnly = false,
  leadDetailHrefPrefix = "/leads",
}: {
  data: CampaignDashboardData;
  range: CampaignDashboardRange;
  granularity: CampaignProgressGranularity;
  agentUserId: string;
  stages: LeadStage[];
  lostReasons: LostReason[];
  callOutcomes: { id: string; name: string }[];
  canCall: boolean;
  canUpdate: boolean;
  canUpdateCall: boolean;
  canCreateFollowUp: boolean;
  callerOnly?: boolean;
  leadDetailHrefPrefix?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    router.refresh();
  }

  function selectAssignee(userId: string | null) {
    pushParams((params) => {
      if (userId) params.set("assignee", userId);
      else params.delete("assignee");
      params.delete("leadId");
      params.delete("leadPage");
    });
  }

  function selectLead(leadId: string) {
    pushParams((params) => {
      params.set("leadId", leadId);
    });
  }

  function goLeadPage(page: number) {
    pushParams((params) => {
      if (page <= 1) params.delete("leadPage");
      else params.set("leadPage", String(page));
      params.delete("leadId");
    });
  }

  const summaryRows = useMemo(
    () => [
      ["Metric", "Value"],
      ["Campaign", data.campaign.name],
      ["Status", data.campaign.status],
      ["Total Leads", data.summary.totalLeads],
      ["Assigned", data.summary.assigned],
      ["Conversion Rate", formatRate(data.summary.conversionRate)],
      ["Selected assignee", data.selectedAssigneeName ?? "All"],
    ],
    [data],
  );

  function exportSummaryCsv() {
    const headers = summaryRows[0] as string[];
    const rows = summaryRows.slice(1).map((row) => ({
      Metric: String(row[0]),
      Value: String(row[1]),
    }));
    downloadBlob(
      `${data.campaign.name.replace(/\s+/g, "-").toLowerCase()}-dashboard.csv`,
      renderCsv(headers, rows),
      "text/csv;charset=utf-8",
    );
  }

  function exportSummaryExcel() {
    const sheet = XLSX.utils.aoa_to_sheet(summaryRows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Dashboard");
    const leads = data.assigneeLeads.map((lead) => ({
      Name: lead.fullName,
      Phone: lead.phone ?? "",
      Assignee: lead.assigneeName,
      Status: lead.stageName,
      "Lost reason": lead.lostReasonName ?? "",
    }));
    if (leads.length > 0) {
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(leads), "Leads");
    }
    const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
    downloadBlob(
      `${data.campaign.name.replace(/\s+/g, "-").toLowerCase()}-dashboard.xlsx`,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }

  const assigneeChartData = data.assigneePerformance.map((row) => ({
    key: row.userId,
    label: row.employeeName,
    count: row.assignedLeads,
  }));

  const cards: Array<{ label: string; value: string | number }> = [
    { label: "Total Leads", value: data.summary.totalLeads },
    { label: "Fresh", value: data.summary.fresh },
    { label: "Contacted", value: data.summary.contacted },
    { label: "Interested", value: data.summary.interested },
    { label: "Lost", value: data.summary.lost },
    { label: "Calls Today", value: data.summary.callsToday },
    { label: "Pending Follow Ups", value: data.summary.pendingFollowUps },
    { label: "Conversion", value: formatRate(data.summary.conversionRate) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{data.campaign.name}</h2>
              <Badge tone={statusTone(data.campaign.status)} dot>
                {data.campaign.status}
              </Badge>
              <span className="text-muted text-sm tabular-nums">{data.progressPercent}% progress</span>
            </div>
            <p className="text-muted mt-1 text-sm">
              Owner {data.ownerName} · Priority {data.priority} ·{" "}
              {data.assignedUserNames.length} assignees
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.canExportLeads ? (
              <Link
                href={`/api/leads/export?campaignId=${data.campaign.id}${
                  data.selectedAssigneeId
                    ? `&assignedToUserId=${data.selectedAssigneeId}`
                    : ""
                }`}
              >
                <Button variant="secondary" size="sm">
                  Export leads CSV
                </Button>
              </Link>
            ) : null}
            {data.canExportSummary ? (
              <>
                <Button variant="secondary" size="sm" onClick={exportSummaryCsv}>
                  Export CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={exportSummaryExcel}>
                  Export Excel
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <Suspense fallback={<p className="text-muted text-sm">Loading filters…</p>}>
          <RangeFilters selected={range} granularity={granularity} />
        </Suspense>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </section>

      {/* Three-pane workspace: reports · leads · detail */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left — reports */}
        <aside className="mx-card flex flex-col gap-2 p-3 xl:col-span-3">
          <p className="text-muted px-1 text-xs font-medium uppercase tracking-wide">
            Campaign reports
          </p>

          {data.showTeamCharts ? (
            <ReportAccordion title="Campaign Assignees Report" defaultOpen>
              <p className="text-muted mb-2 text-xs">
                All assignee leads are listed by default. Click a name to filter to one person.
              </p>
              <DonutChart
                data={assigneeChartData}
                height={200}
                showSideLegend
                onSliceClick={(userId) => selectAssignee(userId)}
              />
              {data.selectedAssigneeId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => selectAssignee(null)}
                >
                  Show all assignees
                </Button>
              ) : null}
            </ReportAccordion>
          ) : (
            <ReportAccordion title="My assignment" defaultOpen>
              <p className="text-sm font-medium">
                {data.selectedAssigneeName ?? "You"}
              </p>
              <p className="text-muted mt-1 text-xs">
                You only see your own customers and leads in this campaign.
              </p>
            </ReportAccordion>
          )}

          <ReportAccordion title="Campaign Calling Report" defaultOpen>
            <DonutChart data={data.callingReport} height={180} showSideLegend />
          </ReportAccordion>

          <ReportAccordion title="Leads Status Report" defaultOpen>
            <DonutChart data={data.leadStatusDistribution} height={180} showSideLegend />
          </ReportAccordion>

          <ReportAccordion title="Leads Lost Reason Report">
            <DonutChart data={data.lostReasonDistribution} height={180} showSideLegend />
          </ReportAccordion>

          <ReportAccordion title="Calls Status Report">
            <DonutChart data={data.callOutcomes} height={180} showSideLegend />
          </ReportAccordion>

          <ReportAccordion title="Lead source">
            <HorizontalBarChart data={data.leadSourceDistribution} height={180} />
          </ReportAccordion>

          <ReportAccordion title="Campaign progress">
            <TrendLineChart data={data.progressSeries} height={180} />
          </ReportAccordion>
        </aside>

        {/* Middle — lead list */}
        <section className="mx-card flex min-h-[480px] flex-col xl:col-span-4">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium">
              {data.campaign.name}
              {data.mode === "self" ? (
                <span className="text-muted font-normal"> · My leads</span>
              ) : data.selectedAssigneeName ? (
                <>
                  {" "}
                  <span className="text-muted">›</span> {data.selectedAssigneeName} Leads
                </>
              ) : (
                <span className="text-muted font-normal"> · All assignees</span>
              )}
            </p>
            <p className="text-muted mt-0.5 text-xs tabular-nums">
              {data.leadPaging.total === 0
                ? "0 leads"
                : `Showing ${
                    (data.leadPaging.page - 1) * data.leadPaging.pageSize + 1
                  }–${
                    (data.leadPaging.page - 1) * data.leadPaging.pageSize +
                    data.assigneeLeads.length
                  } of ${data.leadPaging.total}`}
              {data.mode === "full" && !data.selectedAssigneeId
                ? " across campaign assignees"
                : ""}
            </p>
          </div>

          <div className="mx-scroll flex-1 overflow-y-auto">
            {data.assigneeLeads.length === 0 ? (
              <p className="text-muted px-4 py-10 text-center text-sm">
                {data.mode === "self"
                  ? "No leads assigned to you in this campaign."
                  : data.selectedAssigneeName
                    ? `No leads assigned to ${data.selectedAssigneeName}.`
                    : "No assigned leads in this campaign yet."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.assigneeLeads.map((lead) => {
                  const active = data.selectedLeadId === lead.id;
                  return (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => selectLead(lead.id)}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                          active ? "bg-accent-muted" : "hover:bg-surface-sunken"
                        }`}
                      >
                        <span className="text-accent text-sm font-semibold tracking-tight">
                          {lead.fullName}
                        </span>
                        <span className="text-muted text-xs">{lead.phone ?? "No phone"}</span>
                        {data.mode === "full" && !data.selectedAssigneeId ? (
                          <span className="text-muted text-xs">{lead.assigneeName}</span>
                        ) : null}
                        <span className="mt-0.5">
                          <Badge tone={statusTone(lead.stageName)} dot>
                            {lead.stageName}
                            {lead.lostReasonName ? ` · ${lead.lostReasonName}` : ""}
                          </Badge>
                        </span>
                        {lead.recordings.length > 0 ? (
                          <span className="text-muted text-[11px]">
                            {lead.recordings.length} recording
                            {lead.recordings.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {data.leadPaging.total > data.leadPaging.pageSize ? (
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!data.leadPaging.hasPrev}
                onClick={() => goLeadPage(data.leadPaging.page - 1)}
              >
                Previous
              </Button>
              <span className="text-muted text-xs tabular-nums">
                Page {data.leadPaging.page} of{" "}
                {Math.max(1, Math.ceil(data.leadPaging.total / data.leadPaging.pageSize))}
              </span>
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={!data.leadPaging.hasNext}
                onClick={() => goLeadPage(data.leadPaging.page + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>

        {/* Right — lead detail */}
        <section className="mx-card flex min-h-[480px] flex-col xl:col-span-5">
          {!data.selectedLead ? (
            <div className="text-muted flex flex-1 items-center justify-center px-6 py-10 text-center text-sm">
              Select a lead to call, update stage, or move to the next lead.
            </div>
          ) : (
            <>
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight uppercase">
                      {data.selectedLead.fullName}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(data.selectedLead.stageName)} dot>
                        {data.selectedLead.stageName}
                      </Badge>
                      {data.selectedLead.lostReasonName ? (
                        <span className="text-muted text-xs">
                          {data.selectedLead.lostReasonName}
                        </span>
                      ) : null}
                      <Badge tone="neutral">{data.selectedLead.assigneeName}</Badge>
                    </div>
                  </div>
                  <Link href={`${leadDetailHrefPrefix}/${data.selectedLead.id}`}>
                    <Button size="sm" variant="secondary">
                      Open lead
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 text-sm">
                <div>
                  <p className="text-muted text-xs">Phone</p>
                  <p className="font-medium">{data.selectedLead.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Email</p>
                  <p className="font-medium">{data.selectedLead.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Source</p>
                  <p className="font-medium">{data.selectedLead.sourceName}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Next follow-up</p>
                  <p className="font-medium">
                    {data.selectedLead.nextActionAt
                      ? new Date(data.selectedLead.nextActionAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>

              <CampaignLeadActionsPanel
                lead={data.selectedLead}
                agentUserId={agentUserId}
                campaignId={data.campaign.id}
                stages={stages}
                lostReasons={lostReasons}
                callOutcomes={callOutcomes}
                canCall={canCall}
                canUpdate={canUpdate}
                canUpdateCall={canUpdateCall}
                canCreateFollowUp={canCreateFollowUp}
                callerOnly={callerOnly}
              />
            </>
          )}
        </section>
      </div>

      {data.showTeamCharts ? (
        <Card>
          <CardHeader title="Assignee performance" description="Click a name in the assignees report to filter leads." />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted border-b border-border text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">Assigned</th>
                  <th className="px-2 py-2 font-medium">Calls</th>
                  <th className="px-2 py-2 font-medium">Connected</th>
                  <th className="px-2 py-2 font-medium">Conversion</th>
                  <th className="px-2 py-2 font-medium">Pending</th>
                  <th className="px-2 py-2 font-medium">Completed</th>
                  <th className="px-2 py-2 font-medium">Avg duration</th>
                </tr>
              </thead>
              <tbody>
                {data.assigneePerformance.map((row) => (
                  <tr key={row.userId} className="border-b border-border/70">
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        className="text-accent font-medium hover:underline underline-offset-4"
                        onClick={() => selectAssignee(row.userId)}
                      >
                        {row.employeeName}
                      </button>
                    </td>
                    <td className="px-2 py-2.5 tabular-nums">{row.assignedLeads}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.calls}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.connected}</td>
                    <td className="px-2 py-2.5 tabular-nums">{formatRate(row.conversionRate)}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.pending}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.completed}</td>
                    <td className="px-2 py-2.5 tabular-nums">
                      {formatDuration(row.averageCallDurationSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
