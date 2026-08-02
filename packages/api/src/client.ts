import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { sessionCookieName } from "@mudrax/shared";

export type AuthTokenProvider = () => Promise<string | null> | string | null;

export interface CreateApiClientOptions {
  /** Base URL of the Next.js CRM (e.g. https://crm.example.com). */
  baseURL: string;
  /**
   * Returns the Auth.js session JWT for mobile SecureStore (or equivalent).
   * When set, the client attaches it as the Auth.js session cookie header.
   */
  getSessionToken?: AuthTokenProvider;
  /** Override cookie name; defaults to mudrax session cookie for the environment. */
  sessionCookieName?: string;
  /** When true, use the production `__Secure-` cookie name. */
  isProduction?: boolean;
  /** Extra Axios headers. */
  headers?: Record<string, string>;
  /** Request timeout in ms. */
  timeoutMs?: number;
}

export interface MudraxApiClient {
  http: AxiosInstance;
}

export function createApiClient(options: CreateApiClientOptions): MudraxApiClient {
  const cookieName =
    options.sessionCookieName ??
    sessionCookieName(options.isProduction ?? false);

  const http = axios.create({
    baseURL: options.baseURL.replace(/\/$/, ""),
    timeout: options.timeoutMs ?? 30_000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
    // Browser clients may use cookies; mobile injects Cookie explicitly.
    withCredentials: true,
  });

  http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (!options.getSessionToken) {
      return config;
    }
    const token = await options.getSessionToken();
    if (!token) {
      return config;
    }
    const existing = config.headers.get?.("Cookie") ?? config.headers.Cookie;
    const sessionCookie = `${cookieName}=${token}`;
    const cookieHeader =
      typeof existing === "string" && existing.length > 0
        ? `${existing}; ${sessionCookie}`
        : sessionCookie;
    config.headers.set("Cookie", cookieHeader);
    return config;
  });

  return { http };
}
