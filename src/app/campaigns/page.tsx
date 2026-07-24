import Link from "next/link";
import { requirePermission } from "@/infra/auth/session";
import { hasPermission } from "@/modules/rbac";
import { listCampaigns } from "@/modules/campaigns";
import { CampaignForm } from "@/modules/campaigns/presentation/components/CampaignForm";
import { createCampaignAction } from "@/modules/campaigns/presentation/controllers/createCampaign.action";

export default async function CampaignsPage() {
  const { authContext } = await requirePermission("campaign.view");
  const canManage = hasPermission(authContext, "campaign.manage");

  const campaigns = await listCampaigns(authContext.organizationId);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Link href="/" className="text-sm underline underline-offset-4">
        ← Home
      </Link>

      <div>
        <h1 className="text-lg font-semibold">Campaigns</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Outbound Lead-distribution campaigns and their member allocations.
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-foreground/60 border-b border-black/10 dark:border-white/15">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-foreground/60 px-4 py-6 text-center">
                  No Campaigns yet.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3">{campaign.name}</td>
                  <td className="px-4 py-3">{campaign.status}</td>
                  <td className="px-4 py-3">
                    {campaign.startDate ?? "—"} → {campaign.endDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {canManage ? (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-sm font-medium">Create Campaign</h2>
          <div className="mt-4">
            <CampaignForm action={createCampaignAction} />
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/leads" className="underline underline-offset-4">
          Leads →
        </Link>
        <Link href="/crm" className="underline underline-offset-4">
          CRM Dashboard →
        </Link>
      </nav>
    </div>
  );
}
