// ============================================================================
// Display + classification helpers for Caller reporting lines.
// Standard Callers report to a Team Lead; freelancers report directly to Admin.
// ============================================================================

/** True when a Caller has no Team Lead (Admin-managed freelancer). */
export function isDirectAdminCaller(input: {
  roleName: string | null | undefined;
  assignedTeamLeadId: string | null | undefined;
}): boolean {
  return input.roleName === "Caller" && !input.assignedTeamLeadId;
}

/**
 * Label for the Caller's Reports To column / profile line.
 * Standard: Team Lead name. Freelancer: "Direct Admin".
 */
export function callerReportsToLabel(
  assignedTeamLeadName: string | null | undefined,
): string {
  const name = assignedTeamLeadName?.trim();
  return name && name.length > 0 ? name : "Direct Admin";
}
