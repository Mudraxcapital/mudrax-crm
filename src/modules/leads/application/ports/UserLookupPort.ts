// ============================================================================
// src/modules/leads/application/ports/UserLookupPort.ts
//
// Port (interface) this module depends on to validate Lead Assignment
// targets against `users`, without importing anything from `users`' internal
// folders — only its public index.ts, wired in this module's own index.ts.
// ============================================================================

export interface UserLookupSummary {
  id: string;
  organizationId: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  fullName?: string;
  email?: string;
  /** Present when looked up via the users adapter — used for hierarchy ownership. */
  roleName?: string | null;
  assignedTeamLeadId?: string | null;
  reportingManagerId?: string | null;
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserLookupSummary | null>;
  /** Optional directory lookup for CSV/Excel import agent resolution. */
  listByOrganization?(organizationId: string): Promise<UserLookupSummary[]>;
}
