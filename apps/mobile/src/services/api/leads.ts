import type { ListLeadsParams } from "@mudrax/api";
import { getApi } from "./client";

export const leadsApi = {
  list: (params?: ListLeadsParams) => getApi().leads.list(params),
  getById: (id: string) => getApi().leads.getById(id),
};
