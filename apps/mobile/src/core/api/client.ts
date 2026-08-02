import { createMudraxApi, type MudraxApi } from "@mudrax/api";
import { sessionCookieName } from "@mudrax/shared";
import { API_BASE_URL, IS_PRODUCTION } from "@/core/config/env";
import { getSessionToken } from "@/core/storage";

let apiSingleton: MudraxApi | null = null;

export function getApi(): MudraxApi {
  if (!apiSingleton) {
    apiSingleton = createMudraxApi({
      baseURL: API_BASE_URL,
      isProduction: IS_PRODUCTION,
      sessionCookieName: sessionCookieName(IS_PRODUCTION),
      getSessionToken,
    });
  }
  return apiSingleton;
}

/** Reset after logout so the next call rebuilds with a fresh token provider. */
export function resetApiClient(): void {
  apiSingleton = null;
}
