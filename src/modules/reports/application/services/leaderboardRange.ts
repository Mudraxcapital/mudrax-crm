// ============================================================================
// src/modules/reports/application/services/leaderboardRange.ts
// ============================================================================

import type { CallerLeaderboardPreset } from "../validators/callerLeaderboardSchemas";

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  start.setDate(start.getDate() - diff);
  return start;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

export function resolveLeaderboardRange(
  preset: CallerLeaderboardPreset,
  dateFrom?: string,
  dateTo?: string,
  now: Date = new Date(),
): { from: Date; to: Date } {
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      return { from: startOfDay(day), to: endOfDay(day) };
    }
    case "this_week":
      return { from: startOfWeek(now), to: endOfDay(now) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "this_year":
      return { from: startOfYear(now), to: endOfDay(now) };
    case "custom": {
      const from = dateFrom ? new Date(dateFrom) : startOfDay(now);
      const to = dateTo ? new Date(dateTo) : endOfDay(now);
      return { from, to };
    }
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}
