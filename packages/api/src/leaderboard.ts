import type {
  LeaderboardPage,
  LeaderboardPageResponse,
  LeaderboardQuery,
} from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface LeaderboardApi {
  getDashboard: (query?: LeaderboardQuery) => Promise<LeaderboardPage>;
}

export function createLeaderboardApi(http: AxiosInstance): LeaderboardApi {
  return {
    async getDashboard(query = {}) {
      try {
        const { data } = await http.get<LeaderboardPageResponse>("/api/leaderboard", {
          params: {
            ...(query.preset ? { preset: query.preset } : {}),
            ...(query.sortBy ? { sortBy: query.sortBy } : {}),
            ...(query.campaignId ? { campaignId: query.campaignId } : {}),
            ...(query.teamLeadId ? { teamLeadId: query.teamLeadId } : {}),
            ...(query.q?.trim() ? { q: query.q.trim() } : {}),
          },
        });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
