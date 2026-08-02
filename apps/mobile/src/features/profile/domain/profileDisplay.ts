import type { AuthMeUser } from "@mudrax/types";

export function profileDisplayName(
  meUser: AuthMeUser | null | undefined,
  sessionName?: string | null,
): string {
  return meUser?.fullName ?? sessionName ?? "User";
}
