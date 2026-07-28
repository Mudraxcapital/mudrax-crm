"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CampaignDashboardFilterInner({
  campaigns,
  selectedCampaignId,
}: {
  campaigns: Array<{ id: string; name: string; status: string }>;
  selectedCampaignId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(campaignId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (campaignId) {
      params.set("campaignId", campaignId);
    } else {
      params.delete("campaignId");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <div className="mx-card flex flex-wrap items-end gap-3 p-4">
      <label className="flex min-w-[240px] flex-1 flex-col gap-1.5 text-sm">
        <span className="mx-label">Campaign</span>
        <select
          className="mx-input"
          value={selectedCampaignId ?? ""}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Campaign"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
              {campaign.status !== "ACTIVE" ? ` (${campaign.status})` : ""}
            </option>
          ))}
        </select>
      </label>
      {selectedCampaignId ? (
        <p className="text-muted pb-2 text-xs">Dashboard scoped to the selected campaign.</p>
      ) : (
        <p className="text-muted pb-2 text-xs">Showing metrics across all campaigns.</p>
      )}
    </div>
  );
}

export function CampaignDashboardFilter(props: {
  campaigns: Array<{ id: string; name: string; status: string }>;
  selectedCampaignId: string | null;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-card p-4">
          <p className="text-muted text-sm">Loading campaigns…</p>
        </div>
      }
    >
      <CampaignDashboardFilterInner {...props} />
    </Suspense>
  );
}
