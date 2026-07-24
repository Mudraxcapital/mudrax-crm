// ============================================================================
// src/modules/rbac/domain/value-objects/DataScope.ts
//
// Enterprise-wide RBAC Data Scope vocabulary (platform-contracts.md §2) —
// fixed, closed set. `rank` gives a total order so a User holding the same
// Permission via more than one Role resolves to the single widest-Scope
// grant (the natural reading of "a User can hold multiple Roles" — ADR 0002
// — combined with "resolved once, centrally" — platform-contracts.md §2).
// ============================================================================

export const DATA_SCOPES = ["SELF", "TEAM", "BRANCH", "ORGANIZATION", "SYSTEM"] as const;

export type DataScope = (typeof DATA_SCOPES)[number];

const SCOPE_RANK: Record<DataScope, number> = {
  SELF: 0,
  TEAM: 1,
  BRANCH: 2,
  ORGANIZATION: 3,
  SYSTEM: 4,
};

/** Returns the wider (or equal) of two Data Scopes. */
export function widerScope(a: DataScope, b: DataScope): DataScope {
  return SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b;
}

export function scopeAtLeast(scope: DataScope, minimum: DataScope): boolean {
  return SCOPE_RANK[scope] >= SCOPE_RANK[minimum];
}
