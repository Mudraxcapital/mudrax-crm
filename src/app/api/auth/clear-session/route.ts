// Clears a stale Auth.js JWT that no longer maps to a live / Active user.
// Cookie mutation is only allowed in Route Handlers / Server Actions — not in
// Server Components (e.g. the login page or requireAuth callers).

import { signOut } from "@/infra/auth";

export async function GET(request: Request) {
  const reason = new URL(request.url).searchParams.get("reason");
  const redirectTo =
    reason === "disabled" || reason === "suspended" || reason === "session_revoked"
      ? `/login?reason=${encodeURIComponent(reason === "session_revoked" ? "disabled" : reason)}`
      : "/login";
  await signOut({ redirectTo });
}
