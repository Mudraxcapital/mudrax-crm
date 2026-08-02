import { DEFAULT_PAGE_OFFSET, DEFAULT_PAGE_SIZE } from "@mudrax/shared";
import type { Customer, CustomerListResponse, CustomerResponse } from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface ListCustomersParams {
  limit?: number;
  offset?: number;
}

export interface CustomersApi {
  list: (params?: ListCustomersParams) => Promise<CustomerListResponse>;
  getById: (id: string) => Promise<Customer>;
}

export function createCustomersApi(http: AxiosInstance): CustomersApi {
  return {
    async list(params = {}) {
      try {
        const { data } = await http.get<CustomerListResponse>("/api/customers", {
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
        const { data } = await http.get<CustomerResponse>(`/api/customers/${id}`);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
