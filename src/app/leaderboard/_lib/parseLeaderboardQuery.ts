import {
  callerLeaderboardQuerySchema,
  type CallerLeaderboardQuery,
} from "@/modules/reports";

function optionalParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export interface LeaderboardPageQuery extends CallerLeaderboardQuery {
  selected: string;
  drill: string | undefined;
  q: string | undefined;
}

function parseFilterField<K extends keyof CallerLeaderboardQuery>(
  key: K,
  value: string | undefined,
  fallback: CallerLeaderboardQuery[K],
): CallerLeaderboardQuery[K] {
  if (value == null) return fallback;
  const result = callerLeaderboardQuerySchema.safeParse({
    preset: "this_month",
    sortBy: "most_connections",
    [key]: value,
  });
  if (!result.success) return fallback;
  return result.data[key] ?? fallback;
}

export function parseLeaderboardQuery(
  params: Record<string, string | string[] | undefined>,
): LeaderboardPageQuery {
  const raw = {
    preset: optionalParam(params.preset) ?? "this_month",
    dateFrom: optionalParam(params.dateFrom),
    dateTo: optionalParam(params.dateTo),
    campaignId: optionalParam(params.campaignId),
    teamLeadId: optionalParam(params.teamLeadId),
    callerId: optionalParam(params.callerId),
    stageId: optionalParam(params.stageId),
    sortBy: optionalParam(params.sortBy) ?? "most_connections",
  };

  const parsed = callerLeaderboardQuerySchema.safeParse(raw);

  // Prefer a full parse; on failure keep each individually-valid field so one
  // bad date/id does not wipe campaign/team/sort filters.
  const filters: CallerLeaderboardQuery = parsed.success
    ? parsed.data
    : {
        preset: parseFilterField("preset", raw.preset, "this_month"),
        dateFrom: parseFilterField("dateFrom", raw.dateFrom, undefined),
        dateTo: parseFilterField("dateTo", raw.dateTo, undefined),
        campaignId: parseFilterField("campaignId", raw.campaignId, undefined),
        teamLeadId: parseFilterField("teamLeadId", raw.teamLeadId, undefined),
        callerId: parseFilterField("callerId", raw.callerId, undefined),
        stageId: parseFilterField("stageId", raw.stageId, undefined),
        sortBy: parseFilterField("sortBy", raw.sortBy, "most_connections"),
      };

  return {
    ...filters,
    selected: optionalParam(params.selected) ?? "summary",
    drill: optionalParam(params.drill),
    q: optionalParam(params.q),
  };
}
