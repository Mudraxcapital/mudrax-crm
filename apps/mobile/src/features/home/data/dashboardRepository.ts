import type { HomeDashboard } from "@mudrax/types";
import { getApi } from "@/core/api";

export async function fetchHomeDashboard(campaignId?: string | null): Promise<HomeDashboard> {
  return getApi().home.getDashboard({ campaignId });
}
