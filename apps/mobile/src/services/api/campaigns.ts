import type { ListCampaignsParams } from "@mudrax/api";
import { getApi } from "./client";

export const campaignsApi = {
  list: (params?: ListCampaignsParams) => getApi().campaigns.list(params),
  getById: (id: string) => getApi().campaigns.getById(id),
};
