import Link from "next/link";
import { requireCallerWorkspace } from "@/infra/auth/session";
import { listCampaignsForMember } from "@/modules/campaigns";
import { countLeads } from "@/modules/leads";
import { PageHeader, PageSection } from "@/shared/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";

export default async function CallerMyCampaignsPage() {
  const { session, authContext } = await requireCallerWorkspace();
  const campaigns = await listCampaignsForMember(session.user.id);

  const withCounts = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      assigned: await countLeads(authContext.organizationId, {
        assignedToUserIds: [session.user.id],
        campaignId: campaign.id,
      }),
    })),
  );

  return (
    <PageSection>
      <PageHeader
        title="My Campaigns"
        description="Campaigns you are an active member of. Switch from the dashboard selector anytime."
      />

      {withCounts.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-muted text-sm">You are not assigned to any active campaigns yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {withCounts.map(({ campaign, assigned }) => (
            <Card key={campaign.id}>
              <CardHeader
                title={campaign.name}
                description={campaign.description ?? "No description"}
                actions={
                  <Badge tone={campaign.status === "ACTIVE" ? "success" : "neutral"} dot>
                    {campaign.status}
                  </Badge>
                }
              />
              <CardBody className="flex items-center justify-between gap-3">
                <p className="text-muted text-sm">
                  <span className="text-foreground font-semibold tabular-nums">{assigned}</span>{" "}
                  leads assigned to you
                </p>
                <div className="flex gap-2">
                  <Link href={`/?campaignId=${campaign.id}`}>
                    <Button variant="secondary" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  <Link href={`/caller/leads?campaignId=${campaign.id}`}>
                    <Button size="sm">My Leads</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageSection>
  );
}
