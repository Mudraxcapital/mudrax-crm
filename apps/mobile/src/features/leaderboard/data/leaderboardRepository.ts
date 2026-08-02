import type { LeaderboardPage, LeaderboardQuery } from "@mudrax/types";
import { getApi } from "@/core/api";

export function fetchLeaderboard(query?: LeaderboardQuery): Promise<LeaderboardPage> {
  return getApi().leaderboard.getDashboard(query);
}
