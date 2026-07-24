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
      <button type="submit" className="mx-btn mx-btn-secondary mx-btn-sm">
        Sign out
      </button>
    </form>
  );
}
