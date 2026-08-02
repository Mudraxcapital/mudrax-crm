import type {
  AuthCsrfResponse,
  AuthMe,
  AuthMeResponse,
  AuthSession,
  LoginCredentials,
  SessionStatus,
} from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface AuthApi {
  getCsrfToken: () => Promise<string>;
  getSession: () => Promise<AuthSession | null>;
  getSessionStatus: () => Promise<SessionStatus>;
  /** RBAC snapshot (roles + permission codes) for the authenticated user. */
  getMe: () => Promise<AuthMe>;
  /**
   * Credentials sign-in via Auth.js callback endpoint.
   * Returns Set-Cookie session token value when the server provides one
   * (mobile clients should persist it in SecureStore).
   */
  signInWithCredentials: (
    credentials: LoginCredentials,
  ) => Promise<{ sessionToken: string | null }>;
  signOut: () => Promise<void>;
}

export interface CreateAuthApiOptions {
  sessionCookieName?: string;
  /**
   * Used as Auth.js callbackUrl so any redirect stays on a host the device
   * can reach (LAN IP), not localhost from AUTH_URL.
   */
  callbackUrl?: string;
}

function extractSessionTokenFromSetCookie(
  setCookie: string | string[] | undefined,
  cookieName: string,
): string | null {
  if (!setCookie) return null;
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const header of headers) {
    const match = header.match(new RegExp(`${escapeRegExp(cookieName)}=([^;]+)`));
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Merge Set-Cookie header values into a Cookie request header map. */
function ingestSetCookieHeaders(
  jar: Map<string, string>,
  setCookie: string | string[] | undefined,
): void {
  if (!setCookie) return;
  const headers = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const header of headers) {
    const first = header.split(";")[0];
    if (!first) continue;
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
}

function cookieHeaderFromJar(jar: Map<string, string>): string | undefined {
  if (jar.size === 0) return undefined;
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export function createAuthApi(
  http: AxiosInstance,
  options?: CreateAuthApiOptions,
): AuthApi {
  const cookieName = options?.sessionCookieName ?? "mudrax.session-token";
  const callbackUrl = options?.callbackUrl ?? "/";
  /** Auth.js CSRF + session cookies when Set-Cookie is visible to JS. */
  const cookieJar = new Map<string, string>();

  function applyJarCookies(headers: Record<string, string> = {}): Record<string, string> {
    const cookie = cookieHeaderFromJar(cookieJar);
    if (!cookie) return headers;
    const existing = headers.Cookie ?? headers.cookie;
    return {
      ...headers,
      Cookie: existing ? `${existing}; ${cookie}` : cookie,
    };
  }

  return {
    async getCsrfToken() {
      try {
        const response = await http.get<AuthCsrfResponse>("/api/auth/csrf", {
          headers: applyJarCookies(),
        });
        ingestSetCookieHeaders(
          cookieJar,
          response.headers["set-cookie"] ?? response.headers["Set-Cookie"],
        );
        return response.data.csrfToken;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getSession() {
      try {
        const { data } = await http.get<AuthSession | null>("/api/auth/session", {
          headers: applyJarCookies(),
        });
        if (!data?.user?.id) return null;
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getSessionStatus() {
      try {
        const { data } = await http.get<SessionStatus>("/api/auth/session-status", {
          headers: applyJarCookies(),
        });
        return data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async getMe() {
      try {
        const { data } = await http.get<AuthMeResponse>("/api/auth/me", {
          headers: applyJarCookies(),
        });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async signInWithCredentials(credentials) {
      try {
        const csrfToken = await this.getCsrfToken();
        // Match next-auth/react signIn(): force JSON (no 302 to AUTH_URL/localhost).
        const body = new URLSearchParams({
          csrfToken,
          email: credentials.email,
          password: credentials.password,
          callbackUrl,
          json: "true",
        });
        const response = await http.post("/api/auth/callback/credentials", body, {
          headers: applyJarCookies({
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Auth-Return-Redirect": "1",
          }),
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        });
        ingestSetCookieHeaders(
          cookieJar,
          response.headers["set-cookie"] ?? response.headers["Set-Cookie"],
        );
        const setCookie =
          response.headers["set-cookie"] ?? response.headers["Set-Cookie"];
        const sessionToken = extractSessionTokenFromSetCookie(
          setCookie as string | string[] | undefined,
          cookieName,
        );
        // Prefer jar value if header parsing was empty but cookie was ingested.
        return { sessionToken: sessionToken ?? cookieJar.get(cookieName) ?? null };
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async signOut() {
      try {
        const csrfToken = await this.getCsrfToken();
        const body = new URLSearchParams({ csrfToken, callbackUrl, json: "true" });
        await http.post("/api/auth/signout", body, {
          headers: applyJarCookies({
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Auth-Return-Redirect": "1",
          }),
        });
        cookieJar.clear();
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
