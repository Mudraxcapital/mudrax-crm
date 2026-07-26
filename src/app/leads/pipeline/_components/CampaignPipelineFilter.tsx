"use client";

import { useRouter } from "next/navigation";

export function CampaignPipelineFilter({
  campaigns,
  selectedCampaignId,
}: {
  campaigns: Array<{ id: string; name: string; status: string; leadCount: number }>;
  selectedCampaignId: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mx-card flex flex-wrap items-end gap-3 p-4">
      <label className="flex min-w-[240px] flex-1 flex-col gap-1.5 text-sm">
        <span className="mx-label">Campaign</span>
        <select
          className="mx-input"
          value={selectedCampaignId ?? "all"}
          onChange={(event) => {
            const value = event.target.value;
            router.push(
              value === "all"
                ? "/leads/pipeline?campaignId=all"
                : `/leads/pipeline?campaignId=${encodeURIComponent(value)}`,
            );
          }}
        >
          <option value="all">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
              {campaign.status !== "ACTIVE" ? ` (${campaign.status})` : ""}
              {` · ${campaign.leadCount} leads`}
            </option>
          ))}
        </select>
      </label>
      {selectedCampaignId ? (
        <p className="text-muted pb-2 text-xs">Pipeline for this campaign only.</p>
      ) : (
        <p className="text-muted pb-2 text-xs">Showing leads across every campaign.</p>
      )}
    </div>
  );
}
