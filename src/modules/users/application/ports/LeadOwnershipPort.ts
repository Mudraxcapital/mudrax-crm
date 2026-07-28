// ============================================================================
// Port for lead ownership operations needed by User Management
// (safe delete / reassignment). Implemented in infrastructure against leads schema.
// ============================================================================

export interface LeadOwnershipPort {
  /** Leads currently assigned to this user. */
  countAssignedLeads(userId: string): Promise<number>;
  /** Open follow-ups assigned to this user. */
  countAssignedFollowUps(userId: string): Promise<number>;
  /** Batch lead counts for user-management delete/reassign UI. */
  countAssignedLeadsByUserIds(userIds: string[]): Promise<Map<string, number>>;
  /**
   * Reassign every lead with currentAssigneeUserId = fromUserId to toUserId.
   * Closes open assignments and opens new MANUAL_REASSIGNMENT rows.
   */
  reassignLeadsFromUser(
    fromUserId: string,
    toUserId: string,
    actorUserId: string | null,
  ): Promise<number>;
}
