import type { NotificationItem } from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface ListNotificationsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationsApi {
  list: (params?: ListNotificationsParams) => Promise<NotificationItem[]>;
}

export function createNotificationsApi(http: AxiosInstance): NotificationsApi {
  return {
    async list(params = {}) {
      try {
        const { data } = await http.get<{ data: NotificationItem[] }>("/api/notifications", {
          params,
        });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
