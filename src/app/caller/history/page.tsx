import Link from "next/link";
import { requireCallerWorkspace } from "@/infra/auth/session";
import { listCallerCallHistory } from "@/modules/caller-workspace";
import { listCampaignsForMember } from "@/modules/campaigns";
import { CampaignSelector } from "@/modules/caller-workspace/presentation/components/CampaignSelector";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CallerCallHistoryPage({
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

  const rows = await listCallerCallHistory({
    organizationId: authContext.organizationId,
    callerUserId: session.user.id,
    campaignId: selectedCampaignId,
    limit: 300,
  });

  return (
    <PageSection>
      <PageHeader
        title="Call History"
        description="Only your own call attempts."
        actions={
          <CampaignSelector
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status }))}
            selectedCampaignId={selectedCampaignId}
          />
        }
      />

      <Card>
        <CardBody className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted border-b border-border text-xs uppercase tracking-wide">
              <tr>
                <th className="px-2 py-2 font-medium">Customer</th>
                <th className="px-2 py-2 font-medium">Campaign</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Call Time</th>
                <th className="px-2 py-2 font-medium">Duration</th>
                <th className="px-2 py-2 font-medium">Disposition</th>
                <th className="px-2 py-2 font-medium">Follow Up</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted px-2 py-6">
                    No call history for this campaign.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="px-2 py-2.5">
                      {row.leadId ? (
                        <Link
                          href={`/caller/leads/${row.leadId}`}
                          className="text-accent hover:underline"
                        >
                          {row.customerName}
                        </Link>
                      ) : (
                        row.customerName
                      )}
                    </td>
                    <td className="px-2 py-2.5">{row.campaignName ?? "—"}</td>
                    <td className="px-2 py-2.5">{row.status}</td>
                    <td className="px-2 py-2.5">{new Date(row.callTime).toLocaleString()}</td>
                    <td className="px-2 py-2.5 font-mono text-xs">
                      {formatDuration(row.durationSeconds)}
                    </td>
                    <td className="px-2 py-2.5">
                      {row.outcomeName ?? row.disposition ?? "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      {row.followUpAt ? new Date(row.followUpAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageSection>
  );
}
