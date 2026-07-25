"use client";

import { useEffect, useState } from "react";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

/**
 * Live CRM login duration. Starts at session loginAt; stops when the component
 * unmounts (logout navigates away / clears session).
 */
export function LoginDurationTimer({
  loginAt,
  alwaysVisible = false,
}: {
  loginAt: string;
  /** When true, show on mobile too (dashboard / performance). */
  alwaysVisible?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = new Date(loginAt).getTime();
    if (Number.isNaN(started)) return;

    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [loginAt]);

  return (
    <div
      className={
        alwaysVisible
          ? "flex items-center gap-2 rounded-lg border border-border bg-surface-sunken/50 px-2.5 py-1.5 font-mono text-xs tabular-nums"
          : "hidden items-center gap-2 rounded-lg border border-border bg-surface-sunken/50 px-2.5 py-1.5 font-mono text-xs tabular-nums sm:flex"
      }
      title="Current login duration"
      aria-live="polite"
      aria-label={`Current login duration ${formatDuration(elapsed)}`}
    >
      <span className="text-muted text-[10px] tracking-wide uppercase">Login</span>
      <span className="text-foreground font-medium">{formatDuration(elapsed)}</span>
    </div>
  );
}
