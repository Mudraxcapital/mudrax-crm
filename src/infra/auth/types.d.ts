// ============================================================================
// src/infra/auth/types.d.ts
//
// Module augmentation adding this app's identity fields to Auth.js's
// Session/User/JWT types. Deliberately minimal — only stable identity
// (userId, organizationId, fullName). Roles/Permissions/Data Scope are
// never embedded here (see src/modules/rbac's AuthorizationContext) so
// they are always resolved fresh, never stale inside a long-lived JWT.
// ============================================================================

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    organizationId?: string;
    fullName?: string;
  }

  interface Session {
    user: {
      id: string;
      organizationId: string;
      fullName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    fullName?: string;
  }
}

// `next-auth/jwt.d.ts` re-exports JWT with a wildcard (`export * from
// "@auth/core/jwt"`) rather than declaring its own interface, so callback
// signatures defined inside `@auth/core` (e.g. NextAuthConfig's `session`/
// `jwt` callbacks) resolve `JWT` from this module, not from "next-auth/jwt".
// Both augmentations are kept so the type is correct regardless of which
// module a given consumer imports `JWT` from.
declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    fullName?: string;
  }
}
