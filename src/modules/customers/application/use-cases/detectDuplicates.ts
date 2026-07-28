// ============================================================================
// src/modules/customers/application/use-cases/detectDuplicates.ts
//
// Scans active Customers for PHONE/EMAIL overlaps. Name similarity is not used.
// Same phone or same email raises a reviewable candidate; score is 1 only when
// both phone and email match. Deterministic PAN/Aadhaar uniqueness is already
// enforced at create time (customers.md).
// ============================================================================

import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import type { DuplicateMatchType } from "../../domain/entities/CustomerDuplicateCandidate";
import { DuplicateCandidateNotFoundError } from "../../domain/errors/CustomerErrors";
import {
  toDuplicateCandidateDto,
  type DuplicateCandidateDto,
} from "../dto/DuplicateDto";

function pairKey(aId: string, bId: string): string {
  const [left, right] = aId < bId ? [aId, bId] : [bId, aId];
  return `${left}:${right}`;
}

export function makeDetectDuplicates(repository: CustomerRepository) {
  return async function detectDuplicates(
    organizationId: string,
    options?: { customerIds?: string[] },
  ): Promise<{
    created: DuplicateCandidateDto[];
    existing: DuplicateCandidateDto[];
  }> {
    // Page through the active customer set — optionally scoped to hierarchy.
    const PAGE_SIZE = 1_000;
    const customers: Awaited<ReturnType<CustomerRepository["listWithIdentifiers"]>> = [];
    if (options?.customerIds?.length === 0) {
      return { created: [], existing: [] };
    }
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await repository.listWithIdentifiers(organizationId, {
        limit: PAGE_SIZE,
        offset,
        customerIds: options?.customerIds,
      });
      customers.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    const created: DuplicateCandidateDto[] = [];
    const existing: DuplicateCandidateDto[] = [];
    const seenPairs = new Set<string>();

    async function raise(
      aId: string,
      bId: string,
      matchType: DuplicateMatchType,
      matchScore: number | null,
    ) {
      const [left, right] = aId < bId ? [aId, bId] : [bId, aId];
      const key = `${left}:${right}`;
      if (seenPairs.has(key)) return;
      seenPairs.add(key);

      const prior = await repository.findDuplicatePair(left, right);
      if (prior) {
        existing.push(toDuplicateCandidateDto(prior));
        return;
      }
      const candidate = await repository.createDuplicateCandidate({
        customerAId: left,
        customerBId: right,
        matchType,
        matchScore,
      });
      created.push(toDuplicateCandidateDto(candidate));
    }

    // Index active phone / email identifiers → customer ids
    const phoneIndex = new Map<string, string[]>();
    const emailIndex = new Map<string, string[]>();
    for (const entry of customers) {
      for (const identifier of entry.identifiers) {
        if (identifier.status !== "ACTIVE" || !identifier.valueNormalized) continue;
        if (identifier.type !== "PHONE" && identifier.type !== "EMAIL") continue;
        const index = identifier.type === "PHONE" ? phoneIndex : emailIndex;
        const list = index.get(identifier.valueNormalized) ?? [];
        list.push(entry.customer.id);
        index.set(identifier.valueNormalized, list);
      }
    }

    const phonePairs = new Set<string>();
    const emailPairs = new Set<string>();

    for (const [, ids] of phoneIndex) {
      const unique = [...new Set(ids)];
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          phonePairs.add(pairKey(unique[i]!, unique[j]!));
        }
      }
    }
    for (const [, ids] of emailIndex) {
      const unique = [...new Set(ids)];
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          emailPairs.add(pairKey(unique[i]!, unique[j]!));
        }
      }
    }

    const allPairs = new Set([...phonePairs, ...emailPairs]);
    for (const key of allPairs) {
      const [left, right] = key.split(":") as [string, string];
      const samePhone = phonePairs.has(key);
      const sameEmail = emailPairs.has(key);

      if (samePhone && sameEmail) {
        // Both contact channels match — treat as confirmed same person.
        await raise(left, right, "PROBABILISTIC_PHONE", 1);
      } else if (samePhone) {
        await raise(left, right, "PROBABILISTIC_PHONE", 0.8);
      } else {
        await raise(left, right, "PROBABILISTIC_EMAIL", 0.8);
      }
    }

    return { created, existing };
  };
}

export function makeListDuplicateCandidates(repository: CustomerRepository) {
  return async function listDuplicateCandidates(
    organizationId: string,
    status: "DETECTED" | "REVIEWED" | "MERGED" | "DISMISSED" = "DETECTED",
  ): Promise<DuplicateCandidateDto[]> {
    const rows = await repository.listDuplicateCandidates(organizationId, status);
    return rows.map(toDuplicateCandidateDto);
  };
}

export function makeDismissDuplicateCandidate(repository: CustomerRepository) {
  return async function dismissDuplicateCandidate(command: {
    organizationId: string;
    candidateId: string;
    reviewedByUserId: string;
  }): Promise<DuplicateCandidateDto> {
    const existing = await repository.findDuplicateCandidate(command.candidateId);
    if (!existing) {
      throw new DuplicateCandidateNotFoundError(command.candidateId);
    }
    const customerA = await repository.findById(existing.customerAId);
    if (!customerA || customerA.customer.organizationId !== command.organizationId) {
      throw new DuplicateCandidateNotFoundError(command.candidateId);
    }
    const updated = await repository.updateDuplicateCandidateStatus(
      command.candidateId,
      "DISMISSED",
      command.reviewedByUserId,
    );
    return toDuplicateCandidateDto(updated);
  };
}
