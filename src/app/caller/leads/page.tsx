import Link from "next/link";
import { requireCallerWorkspace } from "@/infra/auth/session";
import { listLeads, leadCatalogs, revertExpiredTemporaryAssignments } from "@/modules/leads";
import { listCampaignsForMember } from "@/modules/campaigns";
import { CampaignSelector } from "@/modules/caller-workspace/presentation/components/CampaignSelector";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { excludeTestCatalogRows } from "@/shared/lib/excludeTestCatalog";

export default async function CallerMyLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, authContext } = await requireCallerWorkspace();

  // Auto-revert expired temporary covers so original callers get leads back on their own.
  await revertExpiredTemporaryAssignments({
    organizationId: authContext.organizationId,
    actor: { actorType: "SYSTEM", actorId: null },
  }).catch(() => undefined);

  const params = await searchParams;
  const campaignIdParam = typeof params.campaignId === "string" ? params.campaignId : null;
  const stageId = typeof params.currentStageId === "string" ? params.currentStageId : undefined;
  const sourceId = typeof params.leadSourceId === "string" ? params.leadSourceId : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const campaigns = await listCampaignsForMember(session.user.id);
  const selectedCampaignId =
    campaignIdParam && campaigns.some((c) => c.id === campaignIdParam)
      ? campaignIdParam
      : (campaigns[0]?.id ?? null);

  const [leads, stages, sources] = await Promise.all([
    listLeads(authContext.organizationId, {
      assignedToUserIds: [session.user.id],
      campaignId: selectedCampaignId ?? undefined,
      currentStageId: stageId,
      leadSourceId: sourceId,
      search,
      limit: 5_000,
    }),
    leadCatalogs.listStages(authContext.organizationId),
    leadCatalogs.listSources(authContext.organizationId),
  ]);

  const qs = selectedCampaignId ? `?campaignId=${selectedCampaignId}` : "";

  return (
    <PageSection>
      <PageHeader
        title="My Leads"
        description="Only leads assigned to you. Never team or unassigned leads."
        actions={
          <CampaignSelector
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name, status: c.status }))}
            selectedCampaignId={selectedCampaignId}
          />
        }
      />

      <Card>
        <CardBody>
          <form method="get" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {selectedCampaignId ? (
              <input type="hidden" name="campaignId" value={selectedCampaignId} />
            ) : null}
            <input
              name="search"
              defaultValue={search}
              placeholder="Search name / phone…"
              className="mx-input"
              aria-label="Search"
            />
            <select
              name="currentStageId"
              defaultValue={stageId ?? ""}
              className="mx-input"
              aria-label="Lead status"
            >
              <option value="">Any status</option>
              {excludeTestCatalogRows(stages).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <select
              name="leadSourceId"
              defaultValue={sourceId ?? ""}
              className="mx-input"
              aria-label="Source"
            >
              <option value="">Any source</option>
              {excludeTestCatalogRows(sources).map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>

          <div className="space-y-2">
            {leads.length === 0 ? (
              <p className="text-muted text-sm">No assigned leads match these filters.</p>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/caller/leads/${lead.id}${qs}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {lead.fullNameSnapshot}
                    </Link>
                    <p className="text-muted text-xs">
                      {lead.phoneSnapshot ?? "No phone"} · {lead.leadSourceName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="info" dot>
                      {lead.currentStageName}
                    </Badge>
                    <Link href={`/caller/leads/${lead.id}${qs}`}>
                      <Button variant="secondary" size="sm">
                        Work
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </PageSection>
  );
}
