"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CallerCampaignOptionDto } from "../../application/dto/CallerWorkspaceDto";

function CampaignSelectorInner({
  campaigns,
  selectedCampaignId,
}: {
  campaigns: CallerCampaignOptionDto[];
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
    return (
      <div className="rounded-lg border border-border bg-surface-sunken/40 px-3 py-2 text-sm text-muted">
        No active campaigns assigned
      </div>
    );
  }

  return (
    <label className="flex min-w-[14rem] flex-col gap-1">
      <span className="text-muted text-[10px] font-semibold tracking-[0.08em] uppercase">
        Current Campaign
      </span>
      <select
        className="mx-input"
        value={selectedCampaignId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Current campaign"
      >
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CampaignSelector(props: {
  campaigns: CallerCampaignOptionDto[];
  selectedCampaignId: string | null;
}) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-surface-sunken/40 px-3 py-2 text-sm text-muted">
          Loading campaigns…
        </div>
      }
    >
      <CampaignSelectorInner {...props} />
    </Suspense>
  );
}
