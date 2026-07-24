// ============================================================================
// src/modules/auth/application/ports/PasswordHasher.ts
//
// Port (interface) for the application's chosen password hashing strategy —
// "Hashing... password hashes (modern adaptive algorithm)... irreversible,
// compare-only" (platform-contracts.md §3). The concrete algorithm is an
// infrastructure/adapters concern (see BcryptPasswordHasher) so it can be
// swapped (e.g. to Argon2id) without touching this use-case.
// ============================================================================

export interface PasswordHasher {
  hash(plainTextPassword: string): Promise<string>;
  verify(plainTextPassword: string, storedHash: string): Promise<boolean>;
}
