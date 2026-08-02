export const DATA_SCOPES = ["SELF", "TEAM", "BRANCH", "ORGANIZATION", "SYSTEM"] as const;
export type DataScope = (typeof DATA_SCOPES)[number];

const SCOPE_RANK: Record<DataScope, number> = {
  SELF: 0,
  TEAM: 1,
  BRANCH: 2,
  ORGANIZATION: 3,
  SYSTEM: 4,
};

export function widerScope(a: DataScope, b: DataScope): DataScope {
  return SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b;
}

export function scopeAtLeast(scope: DataScope, minimum: DataScope): boolean {
  return SCOPE_RANK[scope] >= SCOPE_RANK[minimum];
}
