import type { ListCustomersParams } from "@mudrax/api";
import { getApi } from "./client";

export const customersApi = {
  list: (params?: ListCustomersParams) => getApi().customers.list(params),
  getById: (id: string) => getApi().customers.getById(id),
};
