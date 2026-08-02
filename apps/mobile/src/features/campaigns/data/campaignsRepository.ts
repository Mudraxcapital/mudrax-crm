import type { Campaign } from "@mudrax/types";
import { MudraxApiError } from "@mudrax/api";
import { getApi } from "@/core/api";

export async function fetchCampaignsForUser(isCallerWorkspace: boolean): Promise<Campaign[]> {
  if (isCallerWorkspace) {
    try {
      return await getApi().caller.listMyCampaigns();
    } catch (error) {
      if (error instanceof MudraxApiError && error.status === 403) {
        // Fall through to general campaigns list if workspace route is unavailable.
      } else {
        throw error;
      }
    }
  }

  const result = await getApi().campaigns.list({ limit: 200, offset: 0 });
  return result.data;
}
