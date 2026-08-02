import { DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE } from "@mudrax/shared";
import type { Campaign, CampaignListResponse, CampaignResponse } from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface ListCampaignsParams {
  limit?: number;
  offset?: number;
}

export interface CampaignsApi {
  list: (params?: ListCampaignsParams) => Promise<CampaignListResponse>;
  getById: (id: string) => Promise<Campaign>;
}

export function createCampaignsApi(http: AxiosInstance): CampaignsApi {
  return {
    async list(params = {}) {
      try {
        const { data } = await http.get<CampaignListResponse>("/api/campaigns", {
          params: {
            limit: params.limit ?? DEFAULT_PAGE_SIZE,
            offset: params.offset ?? DEFAULT_PAGE_OFFSET,
          },
        });
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getById(id) {
      try {
        const { data } = await http.get<CampaignResponse>(`/api/campaigns/${id}`);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
