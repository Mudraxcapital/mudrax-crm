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

export function SendNotificationForm({
  action,
  templates,
  users,
  customers,
}: {
  action: FormAction;
  templates: { id: string; label: string }[];
  users: { id: string; fullName: string }[];
  customers: { id: string; label: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="templateId" className="text-foreground/80 text-sm font-medium">
          Template
        </label>
        <select id="templateId" name="templateId" required className={inputClass}>
          <option value="">— Select —</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-foreground/80 text-sm font-medium">
            Category
          </label>
          <select id="category" name="category" required className={inputClass}>
            <option value="TRANSACTIONAL">Transactional</option>
            <option value="OTP">OTP</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="MARKETING">Marketing</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="eventCategory" className="text-foreground/80 text-sm font-medium">
            Event category
          </label>
          <input
            id="eventCategory"
            name="eventCategory"
            placeholder="lead.assigned"
            className={inputClass}
          />
        </div>
      </div>

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
          <select id="recipientId" name="recipientId" required className={inputClass}>
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
          <label htmlFor="recipientAddress" className="text-foreground/80 text-sm font-medium">
            Address override (optional)
          </label>
          <input id="recipientAddress" name="recipientAddress" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxRetryAttempts" className="text-foreground/80 text-sm font-medium">
            Max retries
          </label>
          <input
            id="maxRetryAttempts"
            name="maxRetryAttempts"
            type="number"
            min={0}
            max={10}
            defaultValue={3}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="payload" className="text-foreground/80 text-sm font-medium">
          Payload JSON (optional)
        </label>
        <textarea
          id="payload"
          name="payload"
          rows={3}
          placeholder='{"name":"Aarush"}'
          className={inputClass}
        />
      </div>

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
        {isPending ? "Sending…" : "Send Notification"}
      </button>
    </form>
  );
}
