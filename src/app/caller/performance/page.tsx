import { requireCallerWorkspace } from "@/infra/auth/session";
import { getCallerPerformance } from "@/modules/caller-workspace";
import { listCampaignsForMember } from "@/modules/campaigns";
import { CampaignSelector } from "@/modules/caller-workspace/presentation/components/CampaignSelector";
import { LoginDurationTimer } from "@/modules/caller-workspace/presentation/components/LoginDurationTimer";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { StatCard, Card, CardHeader, CardBody } from "@/shared/ui/Card";

function formatClock(seconds: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

export default async function CallerPerformancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requireCallerWorkspace();
  const params = await searchParams;
  const campaignIdParam = typeof params.campaignId === "string" ? params.campaignId : null;
  const campaigns = await listCampaignsForMember(session.user.id);
  const selectedCampaignId =
    campaignIdParam && campaigns.some((c) => c.id === campaignIdParam)
      ? campaignIdParam
      : (campaigns[0]?.id ?? null);

  const performance = await getCallerPerformance({
    organizationId: authContext.organizationId,
    callerUserId: session.user.id,
    loginAt: session.user.loginAt,
    campaignId: selectedCampaignId,
  });

  const tm = performance.timeMetrics;

  return (
    <PageSection>
      <PageHeader
        title="My Performance"
        description="Your statistics only — never other employees."
        meta={<LoginDurationTimer loginAt={session.user.loginAt} alwaysVisible />}
        actions={
          <CampaignSelector
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status }))}
            selectedCampaignId={selectedCampaignId}
          />
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {performance.cards.map((card) => (
          <StatCard key={card.key} label={card.label} value={card.count} />
        ))}
      </section>

      <Card>
        <CardHeader title="Time Metrics" description="Session and talk-time for today" />
        <CardBody className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 text-sm">
          <Metric label="Login Time" value={tm.loginAt ? new Date(tm.loginAt).toLocaleString() : "—"} />
          <Metric
            label="First Call"
            value={tm.firstCallAt ? new Date(tm.firstCallAt).toLocaleString() : "—"}
          />
          <Metric
            label="Last Call"
            value={tm.lastCallAt ? new Date(tm.lastCallAt).toLocaleString() : "—"}
          />
          <Metric label="Current Session" value={formatClock(tm.currentSessionSeconds)} mono />
          <Metric label="Total Login Today" value={formatClock(tm.totalLoginSecondsToday)} mono />
          <Metric label="Total Talk Time" value={formatClock(tm.totalTalkTimeSeconds)} mono />
          <Metric
            label="Average Call Duration"
            value={formatClock(tm.averageCallDurationSeconds)}
            mono
          />
          <Metric label="Longest Call" value={formatClock(tm.longestCallSeconds)} mono />
          <Metric
            label="Calls Per Hour"
            value={tm.callsPerHour != null ? String(tm.callsPerHour) : "—"}
          />
        </CardBody>
      </Card>
    </PageSection>
  );
}

function Metric({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-muted text-[11px] font-medium tracking-wider uppercase">{label}</p>
      <p className={`mt-1 font-medium ${mono ? "font-mono text-xs tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}
