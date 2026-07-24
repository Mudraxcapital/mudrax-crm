// ============================================================================
// src/modules/customers/application/use-cases/detectDuplicates.ts
//
// Scans active Customers for probabilistic PHONE/EMAIL overlaps and name
// collisions. Deterministic PAN/Aadhaar uniqueness is already enforced at
// create time; this raises reviewable Duplicate Candidates (customers.md).
// ============================================================================

import { fuzzyScore } from "@/shared/search/fuzzy";
import type { CustomerRepository } from "../../domain/repositories/CustomerRepository";
import type { DuplicateMatchType } from "../../domain/entities/CustomerDuplicateCandidate";
import { DuplicateCandidateNotFoundError } from "../../domain/errors/CustomerErrors";
import {
  toDuplicateCandidateDto,
  type DuplicateCandidateDto,
} from "../dto/DuplicateDto";

export function makeDetectDuplicates(repository: CustomerRepository) {
  return async function detectDuplicates(organizationId: string): Promise<{
    created: DuplicateCandidateDto[];
    existing: DuplicateCandidateDto[];
  }> {
    const customers = await repository.listWithIdentifiers(organizationId, { limit: 500 });
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

    // Phone / email overlaps
    const phoneIndex = new Map<string, string[]>();
    const emailIndex = new Map<string, string[]>();
    for (const entry of customers) {
      for (const identifier of entry.identifiers) {
        if (identifier.status !== "ACTIVE" || !identifier.valueNormalized) continue;
        const index = identifier.type === "PHONE" ? phoneIndex : emailIndex;
        if (identifier.type !== "PHONE" && identifier.type !== "EMAIL") continue;
        const list = index.get(identifier.valueNormalized) ?? [];
        list.push(entry.customer.id);
        index.set(identifier.valueNormalized, list);
      }
    }

    for (const [, ids] of phoneIndex) {
      const unique = [...new Set(ids)];
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          await raise(unique[i]!, unique[j]!, "PROBABILISTIC_PHONE", 0.8);
        }
      }
    }
    for (const [, ids] of emailIndex) {
      const unique = [...new Set(ids)];
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          await raise(unique[i]!, unique[j]!, "PROBABILISTIC_EMAIL", 0.8);
        }
      }
    }

    // Name similarity (+ optional DOB)
    for (let i = 0; i < customers.length; i++) {
      for (let j = i + 1; j < customers.length; j++) {
        const a = customers[i]!;
        const b = customers[j]!;
        const score = fuzzyScore(a.customer.fullName, b.customer.fullName);
        if (score < 0.72) continue;
        const sameDob =
          a.customer.dob &&
          b.customer.dob &&
          a.customer.dob.toISOString().slice(0, 10) === b.customer.dob.toISOString().slice(0, 10);
        await raise(
          a.customer.id,
          b.customer.id,
          "PROBABILISTIC_NAME_DOB",
          sameDob ? Math.min(1, score + 0.15) : score,
        );
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
    candidateId: string;
    reviewedByUserId: string;
  }): Promise<DuplicateCandidateDto> {
    const existing = await repository.findDuplicateCandidate(command.candidateId);
    if (!existing) {
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
