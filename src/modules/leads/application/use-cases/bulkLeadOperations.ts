// ============================================================================
// src/modules/leads/application/use-cases/bulkLeadOperations.ts
//
// Bulk Assign / Bulk Stage Change / Bulk Close (soft-delete where allowed).
// Each item goes through the same audited aggregate write paths as the
// single-Lead use-cases.
// ============================================================================

import type { LeadRepository } from "../../domain/repositories/LeadRepository";
import type { LeadCatalogRepository } from "../../domain/repositories/LeadCatalogRepository";
import type { LeadAuditActor } from "../../domain/entities/LeadAuditRecord";
import type { UserLookupPort } from "../ports/UserLookupPort";
import {
  BulkOperationError,
  InvalidAssigneeReferenceError,
  InvalidLeadStageReferenceError,
  InvalidLostReasonReferenceError,
  LeadAlreadyClosedError,
  LeadNotFoundError,
  LostReasonRequiredError,
} from "../../domain/errors/LeadErrors";
import type {
  BulkAssignLeadsInput,
  BulkChangeLeadStageInput,
  BulkCloseLeadsInput,
} from "../validators/productivitySchemas";
import { makeAssignLead } from "./assignLead";
import { makeChangeLeadStage } from "./changeLeadStage";

export interface BulkResult {
  succeeded: string[];
  failed: Array<{ leadId: string; error: string }>;
}

export function makeBulkAssignLeads(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
  userLookup: UserLookupPort,
) {
  const assignLead = makeAssignLead(repository, catalogRepository, userLookup);

  return async function bulkAssignLeads(command: {
    organizationId: string;
    input: BulkAssignLeadsInput;
    actor: LeadAuditActor;
  }): Promise<BulkResult> {
    const result: BulkResult = { succeeded: [], failed: [] };
    for (const leadId of command.input.leadIds) {
      try {
        const lead = await repository.findById(leadId);
        if (!lead || lead.organizationId !== command.organizationId) {
          throw new LeadNotFoundError(leadId);
        }
        await assignLead({
          id: leadId,
          input: { assignedToUserId: command.input.assignedToUserId },
          actor: command.actor,
        });
        result.succeeded.push(leadId);
      } catch (error) {
        result.failed.push({
          leadId,
          error: error instanceof Error ? error.message : "Assign failed",
        });
      }
    }
    if (result.succeeded.length === 0 && result.failed.length > 0) {
      throw new BulkOperationError(result.failed[0]!.error);
    }
    return result;
  };
}

export function makeBulkChangeLeadStage(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  const changeLeadStage = makeChangeLeadStage(repository, catalogRepository);

  return async function bulkChangeLeadStage(command: {
    organizationId: string;
    input: BulkChangeLeadStageInput;
    actor: LeadAuditActor;
  }): Promise<BulkResult> {
    const result: BulkResult = { succeeded: [], failed: [] };
    for (const leadId of command.input.leadIds) {
      try {
        const lead = await repository.findById(leadId);
        if (!lead || lead.organizationId !== command.organizationId) {
          throw new LeadNotFoundError(leadId);
        }
        await changeLeadStage({
          id: leadId,
          input: {
            stageId: command.input.stageId,
            lostReasonId: command.input.lostReasonId,
          },
          actor: command.actor,
        });
        result.succeeded.push(leadId);
      } catch (error) {
        result.failed.push({
          leadId,
          error: error instanceof Error ? error.message : "Stage change failed",
        });
      }
    }
    return result;
  };
}

/**
 * Soft-close (Closed-Lost) — kept for Team Lead workflows that should not
 * permanently erase records.
 */
export function makeBulkCloseLeads(
  repository: LeadRepository,
  catalogRepository: LeadCatalogRepository,
) {
  const changeLeadStage = makeChangeLeadStage(repository, catalogRepository);

  return async function bulkCloseLeads(command: {
    organizationId: string;
    input: BulkCloseLeadsInput;
    actor: LeadAuditActor;
  }): Promise<BulkResult> {
    const stages = await catalogRepository.listStages(command.organizationId);
    const lostStage = stages.find(
      (stage) => stage.bucket === "CLOSED" && stage.closeOutcome === "LOST" && stage.isActive,
    );
    if (!lostStage) {
      throw new InvalidLeadStageReferenceError("(no Closed-Lost stage configured)");
    }

    const result: BulkResult = { succeeded: [], failed: [] };
    for (const leadId of command.input.leadIds) {
      try {
        await changeLeadStage({
          id: leadId,
          input: { stageId: lostStage.id, lostReasonId: command.input.lostReasonId },
          actor: command.actor,
        });
        result.succeeded.push(leadId);
      } catch (error) {
        if (
          error instanceof LeadAlreadyClosedError ||
          error instanceof LostReasonRequiredError ||
          error instanceof InvalidLostReasonReferenceError ||
          error instanceof InvalidAssigneeReferenceError ||
          error instanceof LeadNotFoundError
        ) {
          result.failed.push({ leadId, error: error.message });
          continue;
        }
        result.failed.push({
          leadId,
          error: error instanceof Error ? error.message : "Close failed",
        });
      }
    }
    return result;
  };
}

/**
 * Admin / Manager permanent delete — removes Leads from the database and
 * deletes orphaned Customers when no remaining Leads/loan records block it.
 */
export function makeBulkHardDeleteLeads(repository: LeadRepository) {
  return async function bulkHardDeleteLeads(command: {
    organizationId: string;
    leadIds: string[];
  }): Promise<BulkResult & { deletedCustomerIds: string[] }> {
    const outcome = await repository.hardDeleteLeadsWithCustomers(
      command.organizationId,
      command.leadIds,
    );
    if (outcome.deletedLeadIds.length === 0 && outcome.failed.length > 0) {
      throw new BulkOperationError(outcome.failed[0]!.error);
    }
    return {
      succeeded: outcome.deletedLeadIds,
      failed: outcome.failed,
      deletedCustomerIds: outcome.deletedCustomerIds,
    };
  };
}
