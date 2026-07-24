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

export function NotificationPreferenceForm({
  action,
  users,
  customers,
  defaultRecipientId,
}: {
  action: FormAction;
  users: { id: string; fullName: string }[];
  customers: { id: string; label: string }[];
  defaultRecipientId?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recipientType" className="text-foreground/80 text-sm font-medium">
            Recipient type
          </label>
          <select id="recipientType" name="recipientType" required className={inputClass}>
            <option value="USER">User</option>
            <option value="CUSTOMER">Customer</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recipientId" className="text-foreground/80 text-sm font-medium">
            Recipient
          </label>
          <select
            id="recipientId"
            name="recipientId"
            required
            defaultValue={defaultRecipientId}
            className={inputClass}
          >
            <option value="">— Select —</option>
            <optgroup label="Users">
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </optgroup>
            <optgroup label="Customers">
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="eventCategory" className="text-foreground/80 text-sm font-medium">
            Event category
          </label>
          <input
            id="eventCategory"
            name="eventCategory"
            required
            placeholder="OPERATIONAL"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="channelType" className="text-foreground/80 text-sm font-medium">
            Channel (optional)
          </label>
          <select id="channelType" name="channelType" className={inputClass}>
            <option value="">All channels</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isEnabled" defaultChecked />
        Enabled
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
        {isPending ? "Saving…" : "Save Preference"}
      </button>
    </form>
  );
}
