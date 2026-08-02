import { useQuery } from "@tanstack/react-query";
import { useIsCallerWorkspace } from "@/features/auth/hooks/usePermissions";
import { fetchCampaignsForUser } from "@/features/campaigns/data/campaignsRepository";

export const campaignKeys = {
  mine: ["campaigns", "visible"] as const,
};

export function useMyCampaigns() {
  const isCallerWorkspace = useIsCallerWorkspace();
  return useQuery({
    queryKey: [...campaignKeys.mine, isCallerWorkspace ? "caller" : "staff"] as const,
    queryFn: () => fetchCampaignsForUser(isCallerWorkspace),
  });
}
