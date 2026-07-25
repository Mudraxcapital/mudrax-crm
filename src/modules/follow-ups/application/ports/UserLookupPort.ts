// ============================================================================
// src/modules/follow-ups/application/ports/UserLookupPort.ts
//
// Port (interface) this module depends on to validate Follow-up Assignee/
// reassignment targets against `users`, without importing anything from
// `users`' internal folders — only its public index.ts, wired in this
// module's own index.ts.
// ============================================================================

export interface UserLookupSummary {
  id: string;
  organizationId: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserLookupSummary | null>;
}
