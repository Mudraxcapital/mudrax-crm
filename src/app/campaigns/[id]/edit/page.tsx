import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/infra/auth/session";
import { CampaignNotFoundError, getCampaign } from "@/modules/campaigns";
import { EditCampaignForm } from "@/modules/campaigns/presentation/components/EditCampaignForm";
import { updateCampaignAction } from "@/modules/campaigns/presentation/controllers/updateCampaign.action";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("campaign.manage");
  const { id } = await params;

  let campaign;
  try {
    campaign = await getCampaign(id);
  } catch (error) {
    if (error instanceof CampaignNotFoundError) {
      notFound();
    }
    throw error;
  }

  const boundAction = updateCampaignAction.bind(null, id);

  return (
    <div className="mx-page flex max-w-xl flex-col gap-6">
      <Link href={`/campaigns/${id}`} className="text-sm text-accent hover:underline underline-offset-4">
        ← Back to Campaign
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Campaign</h1>
        <p className="text-muted mt-1 text-sm">{campaign.name}</p>
      </div>

      <EditCampaignForm action={boundAction} campaign={campaign} />
    </div>
  );
}
