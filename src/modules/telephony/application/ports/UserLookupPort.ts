// ============================================================================
// src/modules/telephony/application/ports/UserLookupPort.ts
//
// Port (interface) this module depends on to validate the Agent a Call
// Attempt/Agent Session references, without importing anything from
// `users`' internal folders — only its public index.ts, wired in this
// module's own index.ts.
// ============================================================================

export interface UserLookupSummary {
  id: string;
  organizationId: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  fullName: string;
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserLookupSummary | null>;
}
