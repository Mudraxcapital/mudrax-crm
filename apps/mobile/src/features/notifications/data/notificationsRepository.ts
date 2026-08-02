import { getApi } from "@/core/api";

export function listNotifications() {
  return getApi().notifications.list({ limit: 50, offset: 0 });
}
