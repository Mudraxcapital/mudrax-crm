"use client";

import { useActionState } from "react";
import type { NotificationsFormState } from "../controllers/notificationsFormState";

const initialState: NotificationsFormState = {};

type FormAction = (
  state: NotificationsFormState | undefined,
  formData: FormData,
) => Promise<NotificationsFormState>;

const inputClass = "mx-input";

export function TemplateVersionForm({ action }: { action: FormAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="mx-label">
          Subject
        </label>
        <input id="subject" name="subject" maxLength={500} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="mx-label">
          Body
        </label>
        <textarea id="body" name="body" required rows={5} className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" defaultChecked />
        Publish this version
      </label>
      {state.error ? (
        <p role="alert" className="mx-error">
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
