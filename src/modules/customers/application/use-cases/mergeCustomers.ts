// ============================================================================
// src/modules/customers/application/use-cases/mergeCustomers.ts
//
// Manual Customer Merge — additive, audited, irreversible tombstone redirect
// (customers.md). Never automatic.
// ============================================================================

import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import type { CustomerAuditActor } from "../../domain/entities/CustomerAuditRecord";
import {
  CustomerMergeError,
  CustomerNotFoundError,
  InvalidCustomerStateError,
} from "../../domain/errors/CustomerErrors";
import type { MergeCustomersInput } from "../validators/duplicateSchemas";
import { toCustomerDto, type CustomerDto } from "../dto/CustomerDto";
import { toCustomerMergeDto, type CustomerMergeDto } from "../dto/DuplicateDto";

export function makeMergeCustomers(repository: CustomerRepository) {
  return async function mergeCustomers(command: {
    organizationId: string;
    input: MergeCustomersInput;
    actor: CustomerAuditActor;
  }): Promise<{ survivor: CustomerDto; merge: CustomerMergeDto }> {
    const { organizationId, input, actor } = command;

    if (input.survivingCustomerId === input.mergedAwayCustomerId) {
      throw new CustomerMergeError("Surviving and merged-away Customers must be different.");
    }

    const survivor = await repository.findById(input.survivingCustomerId);
    const mergedAway = await repository.findById(input.mergedAwayCustomerId);
    if (!survivor || survivor.customer.organizationId !== organizationId) {
      throw new CustomerNotFoundError(input.survivingCustomerId);
    }
    if (!mergedAway || mergedAway.customer.organizationId !== organizationId) {
      throw new CustomerNotFoundError(input.mergedAwayCustomerId);
    }
    if (survivor.customer.status === "MERGED") {
      throw new InvalidCustomerStateError("Surviving Customer is already MERGED.");
    }
    if (mergedAway.customer.status === "MERGED") {
      throw new InvalidCustomerStateError("Merged-away Customer is already MERGED.");
    }

    if (input.duplicateCandidateId) {
      const candidate = await repository.findDuplicateCandidate(input.duplicateCandidateId);
      if (!candidate) {
        throw new CustomerMergeError(
          `Duplicate Candidate ${input.duplicateCandidateId} was not found.`,
        );
      }
      const pair = new Set([candidate.customerAId, candidate.customerBId]);
      if (
        !pair.has(input.survivingCustomerId) ||
        !pair.has(input.mergedAwayCustomerId)
      ) {
        throw new CustomerMergeError(
          "Merge customers must match the duplicate candidate pair.",
        );
      }
    }

    // All related Customer FK repoints (Leads, Loans, Documents, Calls,
    // Notifications, …) run inside repository.mergeWithAudit's transaction.
    const result = await repository.mergeWithAudit(
      {
        survivingCustomerId: input.survivingCustomerId,
        mergedAwayCustomerId: input.mergedAwayCustomerId,
        duplicateCandidateId: input.duplicateCandidateId ?? null,
        mergedByUserId: actor.actorId ?? input.survivingCustomerId,
        reason: input.reason ?? null,
      },
      actor,
      input.mergedAwayCustomerId,
    );

    return {
      survivor: toCustomerDto(result.survivor),
      merge: toCustomerMergeDto(result.merge),
    };
  };
}
