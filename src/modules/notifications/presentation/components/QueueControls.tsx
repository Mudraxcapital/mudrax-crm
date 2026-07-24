"use client";

import { useTransition } from "react";

export function QueueControls({
  processAction,
  retryAction,
}: {
  processAction: () => Promise<{ error?: string }>;
  retryAction: () => Promise<{ error?: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => void processAction())}
        className="bg-foreground text-background rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        Process Queue
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => void retryAction())}
        className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium disabled:opacity-60 dark:border-white/15"
      >
        Retry Failed
      </button>
    </div>
  );
}
