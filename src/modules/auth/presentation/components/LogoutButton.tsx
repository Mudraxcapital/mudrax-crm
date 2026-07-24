// ============================================================================
// src/modules/auth/presentation/components/LogoutButton.tsx
//
// Server Component — the form posts directly to logoutAction, no client
// interactivity required for a plain sign-out button.
// ============================================================================

import { logoutAction } from "../controllers/logout.action";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg border border-black/10 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        Sign out
      </button>
    </form>
  );
}
