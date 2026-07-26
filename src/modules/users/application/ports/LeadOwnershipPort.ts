// ============================================================================
// Port for lead ownership operations needed by User Management
// (safe delete / reassignment). Implemented in infrastructure against leads schema.
// ============================================================================

export interface LeadOwnershipPort {
  /** Leads currently assigned to this user. */
  countAssignedLeads(userId: string): Promise<number>;
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
