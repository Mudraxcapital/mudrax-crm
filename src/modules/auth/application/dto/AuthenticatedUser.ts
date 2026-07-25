// ============================================================================
// src/modules/auth/application/dto/AuthenticatedUser.ts
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  /** Embedded in JWT — must match DB or every request is rejected. */
  sessionVersion: number;
  /** Tracked UserSession id for per-session logout. */
  sessionId: string;
  mustChangePassword: boolean;
}
