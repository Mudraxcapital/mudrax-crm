import { sessionCookieName } from "@mudrax/shared";
import { createApiClient, type CreateApiClientOptions, type MudraxApiClient } from "./client";
import { createAuthApi, type AuthApi } from "./auth";
import { createCallerApi, type CallerApi } from "./caller";
import { createCampaignsApi, type CampaignsApi } from "./campaigns";
import { createCustomersApi, type CustomersApi } from "./customers";
import { createFollowupsApi, type FollowupsApi } from "./followups";
import { createHomeApi, type HomeApi } from "./home";
import { createLeaderboardApi, type LeaderboardApi } from "./leaderboard";
import { createLeadsApi, type LeadsApi } from "./leads";
import { createNotificationsApi, type NotificationsApi } from "./notifications";
import { createReportsApi, type ReportsApi } from "./reports";
import { createTelephonyApi, type TelephonyApi } from "./telephony";
import { createUsersApi, type UsersApi } from "./users";

export { createApiClient, type CreateApiClientOptions, type MudraxApiClient, type AuthTokenProvider } from "./client";
export { MudraxApiError, type ApiErrorBody } from "./errors";
export { createAuthApi, type AuthApi, type CreateAuthApiOptions } from "./auth";
export { createCallerApi, type CallerApi, type CallerDashboardParams, type ChangePasswordInput } from "./caller";
export { createHomeApi, type HomeApi, type HomeDashboardParams } from "./home";
export { createLeaderboardApi, type LeaderboardApi } from "./leaderboard";
export { createLeadsApi, type LeadsApi, type ListLeadsParams, type ChangeLeadStageInput } from "./leads";
export { createCampaignsApi, type CampaignsApi, type ListCampaignsParams } from "./campaigns";
export { createCustomersApi, type CustomersApi, type ListCustomersParams } from "./customers";
export {
  createFollowupsApi,
  type FollowupsApi,
  type ListFollowupsParams,
  type CreateFollowupInput,
  type UpdateFollowupInput,
  type CompleteFollowupInput,
} from "./followups";
export { createReportsApi, type ReportsApi } from "./reports";
export { createTelephonyApi, type TelephonyApi, type ListCallsParams } from "./telephony";
export { createNotificationsApi, type NotificationsApi, type ListNotificationsParams } from "./notifications";
export { createUsersApi, type UsersApi, type ListUsersParams } from "./users";

export interface MudraxApi {
  client: MudraxApiClient;
  auth: AuthApi;
  caller: CallerApi;
  home: HomeApi;
  leaderboard: LeaderboardApi;
  leads: LeadsApi;
  campaigns: CampaignsApi;
  customers: CustomersApi;
  followups: FollowupsApi;
  reports: ReportsApi;
  telephony: TelephonyApi;
  notifications: NotificationsApi;
  users: UsersApi;
}

export function createMudraxApi(options: CreateApiClientOptions): MudraxApi {
  const client = createApiClient(options);
  const cookie =
    options.sessionCookieName ?? sessionCookieName(options.isProduction ?? false);
  const baseURL = options.baseURL.replace(/\/$/, "");

  return {
    client,
    auth: createAuthApi(client.http, {
      sessionCookieName: cookie,
      callbackUrl: baseURL,
    }),
    caller: createCallerApi(client.http),
    home: createHomeApi(client.http),
    leaderboard: createLeaderboardApi(client.http),
    leads: createLeadsApi(client.http),
    campaigns: createCampaignsApi(client.http),
    customers: createCustomersApi(client.http),
    followups: createFollowupsApi(client.http),
    reports: createReportsApi(client.http),
    telephony: createTelephonyApi(client.http),
    notifications: createNotificationsApi(client.http),
    users: createUsersApi(client.http),
  };
}
