"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import type { UserTrackedSessionDto } from "@/modules/users";
import {
  revokeAllSessionsAction,
  revokeSessionAction,
} from "@/modules/users/presentation/controllers/sessionActions.action";

export function UserSessionsPanel({
  userId,
  activeSessions,
  history,
  canManage,
}: {
  userId: string;
  activeSessions: UserTrackedSessionDto[];
  history: UserTrackedSessionDto[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.error ?? result.success ?? null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-border bg-surface-sunken/50 px-3 py-2 text-sm"
        >
          {message}
        </p>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Current active sessions</h3>
          {canManage && activeSessions.length > 0 ? (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                if (!confirm("Log out all active sessions for this employee?")) return;
                run(() => revokeAllSessionsAction(userId));
              }}
            >
              Logout all sessions
            </Button>
          ) : null}
        </div>
        {activeSessions.length === 0 ? (
          <p className="text-muted text-sm">No active sessions.</p>
        ) : (
          <ul className="space-y-2">
            {activeSessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {session.device ?? "Unknown"} · {session.browser ?? "Unknown"}
                  </p>
                  <p className="text-muted text-xs">
                    IP {session.ipAddress ?? "unknown"} · Last activity{" "}
                    {new Date(session.lastActivityAt).toLocaleString()} · Duration{" "}
                    {session.duration}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => revokeSessionAction(userId, session.id))}
                  >
                    Logout session
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Login history</h3>
        {history.length === 0 ? (
          <p className="text-muted text-sm">No login history yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {session.status} · {session.device ?? "Unknown"} ·{" "}
                    {session.browser ?? "Unknown"}
                  </p>
                  <p className="text-muted text-xs">
                    IP {session.ipAddress ?? "unknown"} · Login{" "}
                    {new Date(session.loginAt).toLocaleString()}
                    {session.logoutAt
                      ? ` · Logout ${new Date(session.logoutAt).toLocaleString()}`
                      : ""}{" "}
                    · Duration {session.duration}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
