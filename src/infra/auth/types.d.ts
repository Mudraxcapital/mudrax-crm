// ============================================================================
// src/infra/auth/types.d.ts
// ============================================================================

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    organizationId?: string;
    fullName?: string;
    sessionVersion?: number;
    sessionId?: string;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      organizationId: string;
      fullName: string;
      /** Must match users.sessionVersion or the session is rejected. */
      sessionVersion: number;
      /** Tracked users.user_sessions row for per-device logout. */
      sessionId: string;
      mustChangePassword: boolean;
      /** ISO timestamp when this CRM login session started (JWT issue time). */
      loginAt: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    fullName?: string;
    sessionVersion?: number;
    sessionId?: string;
    mustChangePassword?: boolean;
    /** ISO timestamp set once at credentials sign-in; cleared on logout. */
    loginAt?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    fullName?: string;
    sessionVersion?: number;
    sessionId?: string;
    mustChangePassword?: boolean;
    loginAt?: string;
  }
}
