import type { AuthMe, AuthSession, LoginCredentials } from "@mudrax/types";
import { loginCredentialsSchema } from "@mudrax/shared";
import { getApi, resetApiClient } from "@/core/api";
import { clearSessionToken, getSessionToken, setSessionToken } from "@/core/storage";

export async function bootstrapSession(): Promise<{
  session: AuthSession | null;
  me: AuthMe | null;
}> {
  const token = await getSessionToken();
  if (!token) return { session: null, me: null };
  const session = await getApi().auth.getSession();
  if (!session?.user?.id) return { session: null, me: null };
  const me = await getApi().auth.getMe();
  return { session, me };
}

export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<{ session: AuthSession | null; me: AuthMe | null }> {
  const parsed = loginCredentialsSchema.parse(credentials);
  const { sessionToken } = await getApi().auth.signInWithCredentials(parsed);
  if (sessionToken) {
    await setSessionToken(sessionToken);
  }
  resetApiClient();
  const session = await getApi().auth.getSession();
  if (!session?.user?.id) return { session: null, me: null };
  const me = await getApi().auth.getMe();
  return { session, me };
}

export async function logout(): Promise<void> {
  try {
    await getApi().auth.signOut();
  } finally {
    await clearSessionToken();
    resetApiClient();
  }
}

export async function refreshAuthMe(): Promise<AuthMe> {
  return getApi().auth.getMe();
}
