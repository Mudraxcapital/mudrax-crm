// ============================================================================
// src/infra/jobs/timezone.ts
//
// Timezone-aware calendar day bounds for organization-scoped scheduling.
// Uses Intl — no extra dependency. Default org timezone is Asia/Kolkata.
// ============================================================================

import type { DayBounds } from "@/modules/follow-ups";

const DEFAULT_TIMEZONE = "Asia/Kolkata";

function partsInZone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if (!year || !month || !day) {
    throw new Error(`Unable to resolve calendar parts for timezone ${timeZone}`);
  }
  return { year, month, day };
}

/**
 * Approximate "local midnight as UTC instant" via binary search against
 * Intl formatting. Accurate for IANA zones used by the CRM.
 */
function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
  // Guess: treat as UTC noon then walk.
  let guess = Date.UTC(year, month - 1, day, 12, 0, 0);
  for (let i = 0; i < 48; i++) {
    const p = partsInZone(new Date(guess), timeZone);
    const cmp =
      p.year !== year
        ? p.year - year
        : p.month !== month
          ? p.month - month
          : p.day - day;
    if (cmp === 0) {
      // Walk backward to start of local day.
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
      const hp = fmt.formatToParts(new Date(guess));
      const hour = Number(hp.find((x) => x.type === "hour")?.value ?? 0);
      const minute = Number(hp.find((x) => x.type === "minute")?.value ?? 0);
      const second = Number(hp.find((x) => x.type === "second")?.value ?? 0);
      return new Date(guess - ((hour * 60 + minute) * 60 + second) * 1000);
    }
    guess -= cmp * 12 * 60 * 60 * 1000;
  }
  // Fallback: UTC midnight of that civil date.
  return new Date(Date.UTC(year, month - 1, day));
}

function shiftCivilDate(
  year: number,
  month: number,
  day: number,
  deltaDays: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function resolveDayBounds(now: Date, timeZone: string = DEFAULT_TIMEZONE): DayBounds {
  const today = partsInZone(now, timeZone);
  const yesterday = shiftCivilDate(today.year, today.month, today.day, -1);
  const tomorrow = shiftCivilDate(today.year, today.month, today.day, 1);

  const dayStart = zonedMidnightUtc(today.year, today.month, today.day, timeZone);
  const dayEnd = zonedMidnightUtc(tomorrow.year, tomorrow.month, tomorrow.day, timeZone);
  const previousDayStart = zonedMidnightUtc(
    yesterday.year,
    yesterday.month,
    yesterday.day,
    timeZone,
  );
  const previousDayEnd = dayStart;

  return {
    dayStart,
    dayEnd,
    dateKey: dateKey(today.year, today.month, today.day),
    previousDayStart,
    previousDayEnd,
    previousDateKey: dateKey(yesterday.year, yesterday.month, yesterday.day),
  };
}

export function minuteKey(now: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  // en-CA yields YYYY-MM-DD, HH:MM
  return fmt.format(now).replace(", ", "T").replace(" ", "T");
}

export { DEFAULT_TIMEZONE };
