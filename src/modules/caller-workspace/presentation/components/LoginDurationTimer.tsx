"use client";

import { useEffect, useState } from "react";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

/**
 * Live daily login duration. Accumulates completed sessions from earlier today
 * (`priorSecondsToday`) plus the current session since `loginAt`, clipped to
 * `dayStartedAt`. Resets automatically when the day window rolls over.
 */
export function LoginDurationTimer({
  loginAt,
  priorSecondsToday = 0,
  dayStartedAt,
  alwaysVisible = false,
}: {
  loginAt: string;
  /** Seconds from ended sessions earlier today (excludes current session). */
  priorSecondsToday?: number;
  /** ISO start-of-day used when `priorSecondsToday` was computed. */
  dayStartedAt?: string;
  /** When true, show on mobile too (dashboard / performance). */
  alwaysVisible?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const sessionLoginMs = new Date(loginAt).getTime();
    if (Number.isNaN(sessionLoginMs)) return;

    const tick = () => {
      const now = Date.now();
      const windowStart = dayStartedAt
        ? new Date(dayStartedAt).getTime()
        : (() => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            return start.getTime();
          })();

      if (Number.isNaN(windowStart)) return;

      const nextDay = new Date(windowStart);
      nextDay.setDate(nextDay.getDate() + 1);
      const stillSameDay = now < nextDay.getTime();

      const effectiveWindowStart = stillSameDay
        ? windowStart
        : (() => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            return start.getTime();
          })();

      const prior = stillSameDay ? priorSecondsToday : 0;
      const sessionStart = Math.max(sessionLoginMs, effectiveWindowStart);
      setElapsed(prior + Math.max(0, Math.floor((now - sessionStart) / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [loginAt, priorSecondsToday, dayStartedAt]);

  return (
    <div
      className={
        alwaysVisible
          ? "flex items-center gap-2 rounded-lg border border-border bg-surface-sunken/50 px-2.5 py-1.5 font-mono text-xs tabular-nums"
          : "hidden items-center gap-2 rounded-lg border border-border bg-surface-sunken/50 px-2.5 py-1.5 font-mono text-xs tabular-nums sm:flex"
      }
      title="Login time today (resets tomorrow)"
      aria-live="polite"
      aria-label={`Login time today ${formatDuration(elapsed)}`}
    >
      <span className="text-muted text-[10px] tracking-wide uppercase">Today</span>
      <span className="text-foreground font-medium">{formatDuration(elapsed)}</span>
    </div>
  );
}
