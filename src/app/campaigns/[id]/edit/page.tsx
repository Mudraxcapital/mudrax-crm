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
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <Link href={`/campaigns/${id}`} className="text-sm underline underline-offset-4">
        ← Back to Campaign
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Edit Campaign</h1>
        <p className="text-foreground/60 mt-1 text-sm">{campaign.name}</p>
      </div>

      <EditCampaignForm action={boundAction} campaign={campaign} />
    </div>
  );
}
