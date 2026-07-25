"use client";

import { useActionState } from "react";
import { PASSWORD_POLICY_HINT } from "@/modules/auth/domain/policies/passwordPolicy";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "../controllers/changePassword.action";

const initial: ChangePasswordState = {};

export function ChangePasswordForm({
  forced = false,
}: {
  /** True when mustChangePassword gate — copy emphasizes temporary password. */
  forced?: boolean;
}) {
  const [state, action, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="mx-label">
          {forced ? "Current (temporary) password" : "Current password"}
        </span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="mx-input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="mx-label">New password</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mx-input"
        />
        <span className="text-muted text-xs">{PASSWORD_POLICY_HINT}</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="mx-label">Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mx-input"
        />
      </label>
      <button type="submit" className="mx-btn mx-btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </button>
      <p className="text-muted text-xs">
        After changing your password you will be signed out on every device and must sign in again.
      </p>
    </form>
  );
}
