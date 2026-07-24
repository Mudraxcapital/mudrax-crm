// ============================================================================
// src/modules/auth/application/dto/AuthenticatedUser.ts
//
// What a successful authentication returns to the Auth.js Credentials
// provider — identity only, never the password hash (security.mdc /
// platform-contracts.md §3: "never expose password hashes").
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
}
