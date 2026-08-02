/**
 * Non-secret session constants aligned with Auth.js config in the web CRM.
 * Cookie name differs by environment (secure prefix in production).
 */

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60;

export const SESSION_COOKIE_NAME_DEV = "mudrax.session-token";
export const SESSION_COOKIE_NAME_PROD = "__Secure-mudrax.session-token";

export function sessionCookieName(isProduction: boolean): string {
  return isProduction ? SESSION_COOKIE_NAME_PROD : SESSION_COOKIE_NAME_DEV;
}
