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

/** Hierarchy edges needed to resolve Team Lead / Manager escalation recipients. */
export interface UserHierarchyLookup {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  assignedTeamLeadId: string | null;
  reportingManagerId: string | null;
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserLookupSummary | null>;
  /** Optional — background escalation jobs resolve TL/Manager via hierarchy. */
  findHierarchy?(userId: string): Promise<UserHierarchyLookup | null>;
  /** Optional — second-level escalation notifies active Admins. */
  listActiveAdminIds?(organizationId: string): Promise<string[]>;
}
