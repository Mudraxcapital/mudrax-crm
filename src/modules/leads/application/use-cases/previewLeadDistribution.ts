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
  /** Required when strategy is MANUAL — all leads go to this agent. */
  manualAssigneeUserId?: string;
}): DistributionPreview {
  const active = input.agents.filter((agent) => agent.availability !== "OFFLINE");
  if (active.length === 0 || input.leadCount === 0) {
    return {
      strategy: input.strategy,
      totalLeads: input.leadCount,
      agents: input.agents.map((agent) => ({
        userId: agent.userId,
        fullName: agent.fullName,
        leadCount: 0,
        openLeads: agent.openLeads ?? 0,
        completedLeads: agent.completedLeads ?? 0,
        availability: agent.availability ?? "AVAILABLE",
      })),
      assignments: [],
    };
  }

  const counts = new Map<string, number>(active.map((agent) => [agent.userId, 0]));
  const assignments: Array<{ rowIndex: number; userId: string }> = [];

  if (input.strategy === "MANUAL") {
    const assignee = input.manualAssigneeUserId ?? active[0]!.userId;
    if (!counts.has(assignee)) {
      throw new Error("Manual assignee must be one of the selected active agents.");
    }
    for (let i = 0; i < input.leadCount; i++) {
      assignments.push({ rowIndex: i, userId: assignee });
      counts.set(assignee, (counts.get(assignee) ?? 0) + 1);
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
      openLeads: agent.openLeads ?? 0,
      completedLeads: agent.completedLeads ?? 0,
      availability: agent.availability ?? "AVAILABLE",
    })),
    assignments,
  };
}
