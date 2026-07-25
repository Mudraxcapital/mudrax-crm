import Link from "next/link";
import type { CallerDashboardDto } from "../../application/dto/CallerWorkspaceDto";
import { CampaignSelector } from "./CampaignSelector";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { LoginDurationTimer } from "./LoginDurationTimer";

export function CallerDashboardView({
  data,
  callerName,
}: {
  data: CallerDashboardDto;
  callerName: string;
}) {
  const firstName = callerName.split(" ")[0] ?? callerName;

  return (
    <PageSection>
      <PageHeader
        title={`Caller workspace · ${firstName}`}
        description="Your assigned leads only — call, disposition, and follow up."
        meta={
          <>
            <Badge tone="accent" dot>
              Caller
            </Badge>
            <LoginDurationTimer loginAt={data.loginAt} alwaysVisible />
          </>
        }
        actions={
          <CampaignSelector
            campaigns={data.campaigns}
            selectedCampaignId={data.selectedCampaignId}
          />
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Today's Assigned" value={data.progress.assignedToday} />
        <StatCard label="Pending Calls" value={data.progress.pendingCalls} />
        <StatCard label="Calls Today" value={data.progress.callsToday} />
        <StatCard label="Completed" value={data.progress.completedCalls} />
        <StatCard label="Follow-ups Today" value={data.progress.followUpsToday} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader
            title="Lead Queue"
            description="Open leads assigned to you"
            actions={
              <Link href={`/caller/leads${data.selectedCampaignId ? `?campaignId=${data.selectedCampaignId}` : ""}`}>
                <Button variant="secondary" size="sm">
                  My Leads
                </Button>
              </Link>
            }
          />
          <CardBody className="space-y-2">
            {data.queue.length === 0 ? (
              <p className="text-muted text-sm">No open assigned leads for this campaign.</p>
            ) : (
              data.queue.slice(0, 12).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/caller/leads/${lead.id}${data.selectedCampaignId ? `?campaignId=${data.selectedCampaignId}` : ""}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {lead.fullNameSnapshot}
                    </Link>
                    <p className="text-muted truncate text-xs">
                      {lead.phoneSnapshot ?? "No phone"} · {lead.currentStageName}
                    </p>
                  </div>
                  <Link
                    href={`/caller/leads/${lead.id}${data.selectedCampaignId ? `?campaignId=${data.selectedCampaignId}` : ""}`}
                  >
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Today's Follow-ups" description="Scheduled for you" />
          <CardBody className="space-y-2">
            {data.followUps.length === 0 ? (
              <p className="text-muted text-sm">No follow-ups scheduled today.</p>
            ) : (
              data.followUps.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"
                >
                  <Link
                    href={`/caller/leads/${item.leadId}`}
                    className="text-accent hover:underline"
                  >
                    {item.leadName}
                  </Link>
                  <span className="text-muted shrink-0 text-xs">
                    {new Date(item.scheduledFor).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="Recent Calls"
            description="Your latest attempts"
            actions={
              <Link href="/caller/history">
                <Button variant="ghost" size="sm">
                  History
                </Button>
              </Link>
            }
          />
          <CardBody className="space-y-2">
            {data.recentCalls.length === 0 ? (
              <p className="text-muted text-sm">No calls today.</p>
            ) : (
              data.recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"
                >
                  <span className="truncate">{call.customerName}</span>
                  <span className="text-muted shrink-0 text-xs">{call.status}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/caller/performance">
          <Button variant="secondary">My Performance</Button>
        </Link>
        <Link href="/caller/campaigns">
          <Button variant="secondary">My Campaigns</Button>
        </Link>
      </div>
    </PageSection>
  );
}
