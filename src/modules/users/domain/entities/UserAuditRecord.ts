// ============================================================================
// src/modules/users/domain/entities/UserAuditRecord.ts
// ============================================================================

export const USER_ACTOR_TYPES = ["USER", "SYSTEM", "AI"] as const;
export type UserActorType = (typeof USER_ACTOR_TYPES)[number];

export interface UserAuditActor {
  actorType: UserActorType;
  actorId: string | null;
}

export interface UserAuditRecord {
  id: string;
  occurredAt: Date;
  actorType: UserActorType;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  recordHash: string;
  previousRecordHash: string | null;
}

export const USER_AUDIT_ACTIONS = [
  "User Created",
  "User Updated",
  "Password Reset",
  "Role Changed",
  "Status Changed",
  "Account Enabled",
  "Account Disabled",
  "Account Suspended",
  "Deleted",
] as const;

export type UserAuditAction = (typeof USER_AUDIT_ACTIONS)[number];
