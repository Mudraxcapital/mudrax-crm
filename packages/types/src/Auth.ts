/**
 * Auth session contracts for clients consuming Auth.js /api/auth/* endpoints.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  sessionVersion: number;
  sessionId: string;
  mustChangePassword: boolean;
}

/** Shape returned by Auth.js GET /api/auth/session when authenticated. */
export interface AuthSession {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    fullName?: string;
    organizationId?: string;
    sessionVersion?: number;
    sessionId?: string;
    mustChangePassword?: boolean;
  };
  expires?: string;
}

export interface SessionStatusOk {
  ok: true;
  status: string;
  sessionVersion: number;
  mustChangePassword: boolean;
}

export interface SessionStatusError {
  ok: false;
  reason: string;
}

export type SessionStatus = SessionStatusOk | SessionStatusError;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthCsrfResponse {
  csrfToken: string;
}
