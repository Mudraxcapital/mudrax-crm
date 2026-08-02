import type { UserListItem } from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface ListUsersParams {
  search?: string | null;
  role?: string | null;
  status?: string | null;
  teamLeadId?: string | null;
}

export interface UsersApi {
  list: (params?: ListUsersParams) => Promise<UserListItem[]>;
}

export function createUsersApi(http: AxiosInstance): UsersApi {
  return {
    async list(params = {}) {
      try {
        const { data } = await http.get<{ users: UserListItem[] }>("/api/users", {
          params: {
            ...(params.search?.trim() ? { search: params.search.trim() } : {}),
            ...(params.role ? { role: params.role } : {}),
            ...(params.status ? { status: params.status } : {}),
            ...(params.teamLeadId ? { teamLeadId: params.teamLeadId } : {}),
          },
        });
        return data.users ?? [];
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
