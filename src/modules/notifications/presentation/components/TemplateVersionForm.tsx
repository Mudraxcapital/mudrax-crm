"use client";

import { useActionState } from "react";
import type { NotificationsFormState } from "../controllers/notificationsFormState";

const initialState: NotificationsFormState = {};

type FormAction = (
  state: NotificationsFormState | undefined,
  formData: FormData,
) => Promise<NotificationsFormState>;

const inputClass =
  "rounded-lg border border-black/10 bg-transparent px-3.5 py-2.5 text-sm transition-colors outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export function TemplateVersionForm({ action }: { action: FormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="text-foreground/80 text-sm font-medium">
          Subject
        </label>
        <input id="subject" name="subject" maxLength={500} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-foreground/80 text-sm font-medium">
          Body
        </label>
        <textarea id="body" name="body" required rows={5} className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" defaultChecked />
        Publish this version
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="bg-foreground text-background self-start rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add Version"}
      </button>
    </form>
  );
}
