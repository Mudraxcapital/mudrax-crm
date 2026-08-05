// ============================================================================
// src/modules/leads/application/use-cases/previewLeadDistribution.ts
//
// Pure preview of how imported Leads will be split across selected agents.
// Mirrors campaigns allocation strategies without writing state.
// ============================================================================

export type ImportDistributionStrategy =
  | "ROUND_ROBIN"
  | "EQUAL"
  | "RANDOM"
  | "MANUAL";

export interface DistributionAgentPreview {
  userId: string;
  fullName: string;
  leadCount: number;
  /** Share of the MANUAL percentage split (0–100), when applicable. */
  percentage: number | null;
  openLeads: number;
  completedLeads: number;
  availability: "AVAILABLE" | "BUSY" | "OFFLINE";
}

export interface DistributionPreview {
  strategy: ImportDistributionStrategy;
  totalLeads: number;
  agents: DistributionAgentPreview[];
  /** lead index → agent userId */
  assignments: Array<{ rowIndex: number; userId: string }>;
}

/** Largest-remainder method so floors cannot consume the whole list early. */
function planPercentageCounts(
  leadCount: number,
  percentages: Record<string, number>,
  activeUserIds: string[],
): Map<string, number> {
  const activeSet = new Set(activeUserIds);
  const entries = Object.entries(percentages).filter(([userId]) => activeSet.has(userId));
  if (entries.length === 0) {
    throw new Error("Manual percentages must include at least one selected active agent.");
  }
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (Math.round(total) !== 100) {
    throw new Error(`Allocation percentages must sum to 100 (got ${total}).`);
  }

  const exact = entries.map(([userId, percentage]) => ({
    userId,
    percentage,
    exactCount: (percentage / 100) * leadCount,
  }));
  const floors = exact.map((row) => ({
    ...row,
    floor: Math.floor(row.exactCount),
    fraction: row.exactCount - Math.floor(row.exactCount),
  }));
  let remaining = leadCount - floors.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...floors].sort(
    (a, b) => b.fraction - a.fraction || a.userId.localeCompare(b.userId),
  );
  const counts = new Map<string, number>(activeUserIds.map((id) => [id, 0]));
  for (const row of floors) {
    counts.set(row.userId, row.floor);
  }
  for (const row of ranked) {
    if (remaining <= 0) break;
    counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
    remaining -= 1;
  }
  return counts;
}

function expandCountsToAssignments(
  leadCount: number,
  counts: Map<string, number>,
): Array<{ rowIndex: number; userId: string }> {
  const assignments: Array<{ rowIndex: number; userId: string }> = [];
  const remaining = new Map(counts);
  for (let i = 0; i < leadCount; i++) {
    let chosen: string | null = null;
    for (const [userId, left] of remaining) {
      if (left > 0) {
        chosen = userId;
        remaining.set(userId, left - 1);
        break;
      }
    }
    if (!chosen) break;
    assignments.push({ rowIndex: i, userId: chosen });
  }
  return assignments;
}

export function previewLeadDistribution(input: {
  leadCount: number;
  strategy: ImportDistributionStrategy;
  agents: Array<{
    userId: string;
    fullName: string;
    openLeads?: number;
    completedLeads?: number;
    availability?: "AVAILABLE" | "BUSY" | "OFFLINE";
  }>;
  /** Required when strategy is MANUAL without percentages — all leads go to this agent. */
  manualAssigneeUserId?: string;
  /**
   * Optional MANUAL percentage split (must sum to 100). When set, overrides
   * single-assignee MANUAL behavior.
   */
  percentages?: Record<string, number>;
}): DistributionPreview {
  const active = input.agents.filter((agent) => agent.availability !== "OFFLINE");
  const emptyAgents = input.agents.map((agent) => ({
    userId: agent.userId,
    fullName: agent.fullName,
    leadCount: 0,
    percentage: input.percentages?.[agent.userId] ?? null,
    openLeads: agent.openLeads ?? 0,
    completedLeads: agent.completedLeads ?? 0,
    availability: agent.availability ?? "AVAILABLE" as const,
  }));

  if (active.length === 0 || input.leadCount === 0) {
    return {
      strategy: input.strategy,
      totalLeads: input.leadCount,
      agents: emptyAgents,
      assignments: [],
    };
  }

  const counts = new Map<string, number>(active.map((agent) => [agent.userId, 0]));
  let assignments: Array<{ rowIndex: number; userId: string }> = [];
  const percentageByUser = new Map<string, number | null>();

  if (input.strategy === "MANUAL" && input.percentages && Object.keys(input.percentages).length > 0) {
    const planned = planPercentageCounts(
      input.leadCount,
      input.percentages,
      active.map((agent) => agent.userId),
    );
    for (const [userId, count] of planned) {
      counts.set(userId, count);
    }
    assignments = expandCountsToAssignments(input.leadCount, planned);
    for (const agent of active) {
      percentageByUser.set(agent.userId, input.percentages[agent.userId] ?? 0);
    }
  } else if (input.strategy === "MANUAL") {
    const assignee = input.manualAssigneeUserId ?? active[0]!.userId;
    if (!counts.has(assignee)) {
      throw new Error("Manual assignee must be one of the selected active agents.");
    }
    for (let i = 0; i < input.leadCount; i++) {
      assignments.push({ rowIndex: i, userId: assignee });
      counts.set(assignee, (counts.get(assignee) ?? 0) + 1);
    }
    percentageByUser.set(assignee, 100);
    for (const agent of active) {
      if (!percentageByUser.has(agent.userId)) percentageByUser.set(agent.userId, 0);
    }
  } else if (input.strategy === "ROUND_ROBIN" || input.strategy === "EQUAL") {
    for (let i = 0; i < input.leadCount; i++) {
      const agent = active[i % active.length]!;
      assignments.push({ rowIndex: i, userId: agent.userId });
      counts.set(agent.userId, (counts.get(agent.userId) ?? 0) + 1);
    }
  } else {
    // RANDOM — shuffle indices then round-robin for balance.
    const indices = Array.from({ length: input.leadCount }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indices[i]!;
      indices[i] = indices[j]!;
      indices[j] = tmp;
    }
    indices.forEach((rowIndex, order) => {
      const agent = active[order % active.length]!;
      assignments.push({ rowIndex, userId: agent.userId });
      counts.set(agent.userId, (counts.get(agent.userId) ?? 0) + 1);
    });
    assignments.sort((a, b) => a.rowIndex - b.rowIndex);
  }

  return {
    strategy: input.strategy,
    totalLeads: input.leadCount,
    agents: input.agents.map((agent) => ({
      userId: agent.userId,
      fullName: agent.fullName,
      leadCount: counts.get(agent.userId) ?? 0,
      percentage: percentageByUser.get(agent.userId) ?? input.percentages?.[agent.userId] ?? null,
      openLeads: agent.openLeads ?? 0,
      completedLeads: agent.completedLeads ?? 0,
      availability: agent.availability ?? "AVAILABLE",
    })),
    assignments,
  };
}
