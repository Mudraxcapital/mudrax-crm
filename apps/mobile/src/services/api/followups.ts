import type { ListFollowupsParams } from "@mudrax/api";
import { getApi } from "./client";

export const followupsApi = {
  list: (params?: ListFollowupsParams) => getApi().followups.list(params),
  getById: (id: string) => getApi().followups.getById(id),
};
