// ============================================================================
// src/modules/lead-center/infrastructure/adapters/LeadsModuleLookupAdapter.ts
// ============================================================================

import { listLeads, leadCatalogs } from "@/modules/leads";
import type {
  ExistingLeadLookupPort,
  ExistingLeadSnapshot,
} from "../../application/ports/ExistingLeadLookupPort";

export class LeadsModuleLookupAdapter implements ExistingLeadLookupPort {
  async listForDuplicateScan(
    organizationId: string,
    options?: { ownerManagerId?: string; ownerTeamLeadId?: string; limit?: number },
  ): Promise<ExistingLeadSnapshot[]> {
    const [leads, stages] = await Promise.all([
      listLeads(organizationId, {
        limit: options?.limit ?? 5_000,
        ownerManagerId: options?.ownerManagerId,
        ownerTeamLeadId: options?.ownerTeamLeadId,
      }),
      leadCatalogs.listStages(organizationId),
    ]);
    const stageById = new Map(stages.map((stage) => [stage.id, stage]));

    return leads.map((lead) => {
      const stage = stageById.get(lead.currentStageId);
      return {
        id: lead.id,
        customerId: lead.customerId,
        fullNameSnapshot: lead.fullNameSnapshot,
        phoneSnapshot: lead.phoneSnapshot,
        emailSnapshot: lead.emailSnapshot,
        currentStageId: lead.currentStageId,
        currentStageName: stage?.name ?? "Unknown",
        stageBucket: stage?.bucket ?? "ACTIVE",
        stageSortOrder: stage?.sortOrder ?? 0,
        updatedAt: new Date(lead.updatedAt),
      };
    });
  }
}
