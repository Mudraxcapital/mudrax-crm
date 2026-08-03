import Constants from "expo-constants";

const extraApiUrl =
  typeof Constants.expoConfig?.extra?.apiUrl === "string"
    ? Constants.expoConfig.extra.apiUrl
    : undefined;

/**
 * CRM API base URL. Prefer EXPO_PUBLIC_API_URL; fall back to localhost for local scaffolding.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
  extraApiUrl?.replace(/\/$/, "") ||
  "http://localhost:3000";

/**
 * Auth.js uses the `__Secure-` session cookie only over HTTPS in production.
 * Do not key this off NODE_ENV alone — release APKs against a local HTTP API
 * must use the non-secure cookie name or sign-in cannot complete.
 *
 * When tunneling a local (NODE_ENV=development) CRM over HTTPS, set
 * EXPO_PUBLIC_USE_SECURE_COOKIE=false so the cookie name still matches the server.
 */
const secureCookieOverride = process.env.EXPO_PUBLIC_USE_SECURE_COOKIE;
export const IS_PRODUCTION =
  secureCookieOverride === "true"
    ? true
    : secureCookieOverride === "false"
      ? false
      : API_BASE_URL.startsWith("https://");
