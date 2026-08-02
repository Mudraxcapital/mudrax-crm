import { useQuery } from "@tanstack/react-query";
import { fetchHomeDashboard } from "@/features/home/data/dashboardRepository";

export const homeDashboardKeys = {
  all: ["home-dashboard"] as const,
  byCampaign: (campaignId?: string | null) =>
    [...homeDashboardKeys.all, campaignId ?? "default"] as const,
};

export function useHomeDashboard(campaignId?: string | null) {
  return useQuery({
    queryKey: homeDashboardKeys.byCampaign(campaignId),
    queryFn: () => fetchHomeDashboard(campaignId),
  });
}

/** @deprecated Prefer useHomeDashboard — kept for transitional imports. */
export function useDashboard(campaignId?: string | null) {
  return useHomeDashboard(campaignId);
}
