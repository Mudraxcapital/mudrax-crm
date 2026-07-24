// ============================================================================
// src/modules/telephony/domain/entities/Extension.ts
//
// Aggregate Root for an Agent's dial-able endpoint (ADR 0006). Extension
// management (provisioning, remote-agent configuration) is out of scope for
// this task's "Implement ONLY" list; this module only needs enough of the
// concept — get-or-create-by-User — to satisfy Agent Session's mandatory
// `extensionId` foreign key, since Agent Session is explicitly in scope.
// ============================================================================

export interface Extension {
  id: string;
  organizationId: string;
  userId: string;
  extensionNumber: string;
  isRemote: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
