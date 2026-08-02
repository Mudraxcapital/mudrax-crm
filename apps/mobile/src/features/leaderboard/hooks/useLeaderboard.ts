import { useQuery } from "@tanstack/react-query";
import type { LeaderboardPreset, LeaderboardSort } from "@mudrax/types";
import { fetchLeaderboard } from "@/features/leaderboard/data/leaderboardRepository";

export function useLeaderboard(preset: LeaderboardPreset, sortBy: LeaderboardSort) {
  return useQuery({
    queryKey: ["leaderboard", preset, sortBy],
    queryFn: () => fetchLeaderboard({ preset, sortBy }),
  });
}
