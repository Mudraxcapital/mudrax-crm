import type { HomeDashboard, HomeDashboardResponse } from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface HomeDashboardParams {
  campaignId?: string | null;
}

export interface HomeApi {
  getDashboard: (params?: HomeDashboardParams) => Promise<HomeDashboard>;
}

export function createHomeApi(http: AxiosInstance): HomeApi {
  return {
    async getDashboard(params = {}) {
      try {
        const { data } = await http.get<HomeDashboardResponse>("/api/home/dashboard", {
          params: params.campaignId ? { campaignId: params.campaignId } : undefined,
        });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
