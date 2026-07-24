// ============================================================================
// src/modules/campaigns/application/ports/UserLookupPort.ts
//
// Port (interface) this module depends on to validate Campaign Membership
// targets against `users`, without importing anything from `users`'
// internal folders — only its public index.ts, wired in this module's own
// index.ts (ADR 0001 one-directional module dependency).
// ============================================================================

export interface UserLookupSummary {
  id: string;
  organizationId: string;
  fullName: string;
  status: "ACTIVE" | "SUSPENDED" | "OFFBOARDED";
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserLookupSummary | null>;
}
